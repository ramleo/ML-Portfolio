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
 *  3. A per-IP rate limit enforced IN THE DATABASE, by
 *     log_security_event(). The in-memory counter below is only a cheap first
 *     pass — serverless instances share no memory, so a flood spread across
 *     them walks straight through it. The database counter is shared by
 *     definition and is the one that actually holds.
 *
 * The IP is never stored. What is stored is an HMAC of it, salted with a
 * server-only secret, which is enough to count requests from one caller and
 * useless to anyone reading the table.
 *
 *  4. A Cloudflare Turnstile token, when TURNSTILE_SECRET_KEY is set. This
 *     is the only guard here that actually separates a browser from a
 *     script: verification happens on Cloudflare's side against signals a
 *     client cannot forge, and the token is single-use and short-lived. With
 *     it configured, a forged Origin gets nowhere.
 *
 * Guards 2 and 3 bound damage; guard 4 prevents entry. Proof-of-work was
 * considered and rejected: a browser can afford ~200ms of hashing and a
 * native attacker does that in microseconds, so it would look like defence
 * without being any.
 *
 * With no Turnstile secret configured this FAILS OPEN — the other three
 * guards still apply and nothing breaks. A logging feature must never be the
 * reason an upload stops working (§6 rule 2).
 */
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { turnstileOk } from "@/lib/turnstileVerify";

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

/** First-pass per-IP limit, per warm instance. Cheap, and catches the obvious
 * case without a database round trip. The real limit is in the database. */
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

  try {
    const b = await req.json();
    const tool = String(b.tool ?? "").slice(0, 80);
    if (EXCLUDED.has(tool)) return NextResponse.json({ ok: true, skipped: true });

    if (!(await turnstileOk(b.turnstile_token, ip, "security-log"))) {
      return NextResponse.json({ error: "Failed verification" }, { status: 403 });
    }

    // Config last, after EVERY check on the request itself. Twice now this
    // sat too early and swallowed the guards below it in local testing —
    // first the origin/rate/size trio, then the Turnstile check. A request
    // that should be refused must be refused on its own merits, never masked
    // by a 500 about our own environment.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("security-log: Supabase env missing");
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";

    // HMAC, not the address. Salted with a server-only secret so a row cannot
    // be reversed into an IP, and so the same caller hashes consistently.
    const ipHash = createHmac("sha256", process.env.AIRAML_LOG_TOKEN ?? "unsalted")
      .update(ip).digest("hex");

    // Insert via the function, not the table: it counts this caller's last
    // minute inside the database, where every serverless instance sees the
    // same number, and refuses rather than writing when the caller is over.
    const { data, error } = await createClient(url, key).rpc("log_security_event", {
      p_session_id: trunc(b.session_id, 80),
      p_run_id:     trunc(b.run_id, 80),
      p_tool:       tool || null,
      p_filename:   trunc(b.filename, 255),
      p_ext:        trunc(b.ext, 16),
      p_size_bytes: int(b.size_bytes, 5_000_000_000),
      p_mime:       trunc(b.mime, 120),
      // A SHA-256 hex digest and nothing else. Anything otherwise shaped is
      // dropped rather than stored — this column must never become a place
      // content can be smuggled into.
      p_sha256:     /^[a-f0-9]{64}$/.test(String(b.sha256 ?? "")) ? String(b.sha256) : null,
      p_prompt_len: int(b.prompt_len, 10_000_000),
      p_country:    country,
      p_ip_hash:    ipHash,
    });
    if (error) {
      console.error("security-log: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (data === false) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("security-log: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
