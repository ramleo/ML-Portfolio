/** E3: surface a stale/dead free-tier key instead of swallowing it.
 *
 * The nightly evals catch a dead free provider on the DOCUMENT path — the paid
 * key starts serving, which the eval flags within a day. Every OTHER LLM route
 * caught a provider's 401/403 and moved on silently, so a free credential could
 * die and quietly escalate to the billed Claude/Gemini key with no signal at
 * all. This records that specific failure (an auth error on a server key) into
 * the `llm_calls` table the analytics dashboard already reads, and tags the
 * server log distinctly so it is greppable in Vercel logs too.
 *
 * Scope (chosen 2026-09-16): ml-portfolio's ai-explain, ai-tools and chat. The
 * HF Spaces are a separate surface and were left out of this pass.
 */
import { createClient } from "@supabase/supabase-js";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** A dead/stale key (401/403), not a transient 429/5xx or a network blip.
 * Providers here signal it two ways: some attach `.status` to the thrown error,
 * others put the code or an "invalid/expired/unauthorized key" phrase in the
 * message. We accept either so no provider's shape slips through. */
export function isAuthFailure(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 403) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /\b40[13]\b/.test(msg) || /invalid or (expired|unauthorized)/i.test(msg) || /unauthorized/i.test(msg);
}

function authStatusOf(e: unknown): number | null {
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 403) return status;
  const m = (e instanceof Error ? e.message : String(e)).match(/\b(40[13])\b/);
  return m ? Number(m[1]) : null;
}

// One row per (route, provider) per warm instance per window: a dead key fails
// on every request, and a single clear dashboard signal per provider beats
// thousands of identical rows. Serverless instances don't share this map, so a
// few duplicates across instances are fine — the point is to bound the flood.
const recent = new Map<string, number>();
const THROTTLE_MS = 10 * 60_000;

/**
 * Record a server-key auth failure. Awaited by callers so the write completes
 * before the serverless response returns, but it never throws into the request:
 * a logging problem must not become a visitor-facing error.
 */
export async function recordProviderAuthFailure(opts: {
  route: string; provider: string; error: unknown;
}): Promise<void> {
  const { route, provider, error } = opts;
  const http = authStatusOf(error);
  const message = error instanceof Error ? error.message : String(error);

  // Distinct, greppable tag in the server log every time, whether or not the DB
  // write runs (e.g. locally, where analytics writes are gated off).
  console.error(`PROVIDER_AUTH_FAIL route=${route} provider=${provider} status=${http ?? "?"} — likely a stale/dead server key`);

  // Local runs are not visitors — see analyticsWrites.ts.
  if (!analyticsWritesEnabled()) return;

  const k = `${route}:${provider}`;
  const now = Date.now();
  if (now - (recent.get(k) ?? 0) < THROTTLE_MS) return;
  recent.set(k, now);
  if (recent.size > 500) recent.clear();   // crude bound on memory growth

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const { error: dbErr } = await createClient(url, key).from("llm_calls").insert({
      service: "vercel",
      tool: route,
      provider,
      status: "error",
      http_status: http,
      error_code: "auth_failure",
      error_message: message.slice(0, 400),
    });
    if (dbErr) console.error("providerAlert: insert failed", dbErr.message);
  } catch (err) {
    console.error("providerAlert: insert threw", err instanceof Error ? err.message : String(err));
  }
}
