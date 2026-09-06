/** Write-only sink for the security log — LOGGING_SPEC.md §5b.
 *
 * WRITE ONLY, on purpose. There is no GET here and there must never be one:
 * §5b requires this table to be unreadable by anything the site exposes, and
 * the table itself has RLS on with no policies so the anon key cannot reach
 * it either. Two locks, because one of them is a line of code someone could
 * delete by accident.
 *
 * Unlike /api/llm-log this is called from the BROWSER, so a shared secret
 * cannot gate it: a secret shipped to the browser is not a secret. What
 * guards it instead, in order of how much each is worth:
 *
 *  1. Every field is clamped server-side. Lengths are cut, numbers are
 *     bounded, and `sha256` must be exactly 64 hex characters or it is
 *     stored as null — so that column can never become a place to smuggle
 *     content into.
 *  2. An Origin allow-list. This stops another website POSTing here from a
 *     visitor's browser. It does NOT stop curl, which can send any Origin it
 *     likes — no header-based check can. It raises the floor, nothing more.
 *  3. A per-IP rate limit. Best-effort: serverless functions do not share
 *     memory, so a determined flood across instances gets through. It stops
 *     the easy case.
 *
 * The residual risk is honest and worth stating: someone determined can put
 * junk rows in this table. They cannot read it, cannot reach any other table,
 * and cannot store anything large. The damage is a polluted security log —
 * which matters, because a log you can bury a real event in is a log you
 * cannot trust. If that ever happens, the fix is a signed token minted
 * server-side per session, not a bigger header check.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const trunc = (v: unknown, n: number) =>
  v === null || v === undefined || v === "" ? null : String(v).slice(0, n);

const int = (v: unknown, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.trunc(n), max) : null;
};

/** §5b: "The password tool is excluded from this log entirely. Its whole
 * promise is that the password never leaves the browser… No hash, no length,
 * no row." Enforced here as well as at the call site, because a promise that
 * depends on every caller remembering is not a promise. */
const EXCLUDED = new Set(["password-audit", "password-strength"]);

/** Reject bodies far larger than a real payload. The biggest legitimate row
 * is a 255-char filename plus a 64-char hash and some short strings. */
const MAX_BODY_BYTES = 4_000;

/** Best-effort per-IP limit. A module-level Map lives as long as one warm
 * serverless instance — it will not see a flood spread across instances, and
 * it is not meant to. */
const HITS = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;   // a person uploading files cannot approach this

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = HITS.get(ip);
  if (!cur || now > cur.resetAt) {
    HITS.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    if (HITS.size > 5_000) HITS.clear();   // crude bound on memory growth
    return false;
  }
  cur.n += 1;
  return cur.n > MAX_PER_WINDOW;
}

/** Same-origin only. NEXT_PUBLIC_SITE_URL when set, plus any *.vercel.app
 * preview of this project, plus localhost for development. */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;              // browsers always send it on POST
  try {
    const host = new URL(origin).host;
    if (host === req.headers.get("host")) return true;
    if (/^localhost(:\d+)?$/.test(host)) return true;
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  // Config is checked AFTER the guards on purpose: a forged or oversized
  // request should be refused on its own merits, not accidentally masked by a
  // 500 about our environment. Getting this order wrong hid all three guards
  // behind an env error in local testing.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("security-log: Supabase env missing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const b = await req.json();
    const tool = String(b.tool ?? "").slice(0, 80);
    if (EXCLUDED.has(tool)) return NextResponse.json({ ok: true, skipped: true });

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";
    const { error } = await createClient(url, key).from("security_log").insert({
      session_id: trunc(b.session_id, 80),
      run_id:     trunc(b.run_id, 80),
      tool:       tool || null,
      filename:   trunc(b.filename, 255),
      ext:        trunc(b.ext, 16),
      size_bytes: int(b.size_bytes, 5_000_000_000),
      mime:       trunc(b.mime, 120),
      // A SHA-256 hex digest and nothing else. Anything longer or otherwise
      // shaped is dropped rather than stored — this column must never become
      // a place content can be smuggled into.
      sha256:     /^[a-f0-9]{64}$/.test(String(b.sha256 ?? "")) ? String(b.sha256) : null,
      prompt_len: int(b.prompt_len, 10_000_000),
      country,
    });
    if (error) {
      console.error("security-log: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("security-log: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
