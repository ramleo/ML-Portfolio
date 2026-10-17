import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Crash-durable click audit — server half (Plan #1/#2).
 *
 * Accepts a BATCH of records (the client flushes its whole outbox at once) and
 * upserts on `event_uuid`, so a record the client re-sends after a crash/beacon
 * is never stored twice. Mirrors /api/track's shape and its local-write gate.
 * Writes to the dedicated `click_audit` table (supabase/click_audit.sql), not the
 * analytics `events` table — audit needs its own store, retention, and access.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BATCH = 500;

/** Per-IP flood guard. This write path is public by necessity (every visitor's
 * browser posts its own clicks), so cap request volume to stop someone scripting
 * junk rows in. The limit is generous because a single request carries a whole
 * batch and an active user flushes in bursts; the durable client outbox retries
 * anything we 429, so a limited request is delayed, never lost.
 *
 * Two layers: (1) the in-memory map below is a cheap FIRST PASS that catches the
 * obvious same-instance case with no round-trip; (2) `dbRateLimited` is the
 * AUTHORITATIVE one — serverless instances share no memory, so a flood spread
 * across them (or arriving after a cold start) walks straight through layer 1,
 * and only the shared database counter (rate_limit.sql) actually holds. */
const HITS = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const WINDOW_SECONDS = 60;
const MAX_PER_WINDOW = 120;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = HITS.get(ip);
  if (!cur || now > cur.resetAt) {
    HITS.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    if (HITS.size > 5_000) HITS.clear(); // crude bound on memory growth
    return false;
  }
  cur.n += 1;
  return cur.n > MAX_PER_WINDOW;
}

/** The durable, shared-across-instances limit (rate_limit.sql's `rate_limit_hit`).
 * The caller is identified by a salted HMAC of its IP (same scheme as
 * security_log), never the raw IP. Returns true only when the DB explicitly says
 * the caller is over its limit; on ANY error (function not yet created, DB hiccup)
 * it returns false — fail open — because a limiter must never break the capture
 * path, and the client outbox would retry a wrongful 429 anyway. */
async function dbRateLimited(
  supabase: ReturnType<typeof getClient>,
  ip: string,
): Promise<boolean> {
  try {
    const ipHash = createHmac("sha256", process.env.AIRAML_LOG_TOKEN ?? "unsalted")
      .update(ip)
      .digest("hex");
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_bucket: "audit",
      p_ip_hash: ipHash,
      p_max: MAX_PER_WINDOW,
      p_window_seconds: WINDOW_SECONDS,
    });
    if (error) return false; // function missing / DB issue → fail open
    return data === false; // the RPC returns false when the caller is over the limit
  } catch {
    return false;
  }
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface InRecord {
  event_uuid?: unknown;
  control?: unknown;
  path?: unknown;
  session_id?: unknown;
  client_ts?: unknown;
  meta?: unknown;
}

function clean(r: InRecord) {
  if (typeof r.event_uuid !== "string" || !r.event_uuid) return null;
  if (typeof r.control !== "string" || !r.control) return null;
  return {
    event_uuid: r.event_uuid.slice(0, 64),
    control: r.control.slice(0, 120),
    path: typeof r.path === "string" ? r.path.slice(0, 300) : "",
    session_id: typeof r.session_id === "string" ? r.session_id.slice(0, 64) : "",
    // actor defaults to the (anonymous) session on this login-less site; the real
    // app wires its authenticated user id in here unchanged.
    actor: typeof r.session_id === "string" ? r.session_id.slice(0, 64) : "",
    client_ts:
      typeof r.client_ts === "number" && isFinite(r.client_ts)
        ? new Date(r.client_ts).toISOString()
        : null,
    meta: r.meta && typeof r.meta === "object" ? r.meta : {},
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (rateLimited(ip))
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });

    const body = await req.json().catch(() => ({}));
    const inRecords: InRecord[] = Array.isArray(body?.records) ? body.records : [];
    if (inRecords.length === 0)
      return NextResponse.json({ error: "records required" }, { status: 400, headers: CORS });

    const rows = inRecords.slice(0, MAX_BATCH).map(clean).filter((r): r is NonNullable<typeof r> => !!r);
    const delivered = rows.map((r) => r.event_uuid);

    // Local runs are not real actors — same gate as /api/track. Report the ids as
    // delivered so the client clears its outbox instead of growing it in dev.
    if (!analyticsWritesEnabled())
      return NextResponse.json({ ok: true, skipped: "local", delivered }, { headers: CORS });

    if (rows.length === 0)
      return NextResponse.json({ ok: true, delivered: [] }, { headers: CORS });

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";
    const supabase = getClient();

    // Authoritative rate limit, shared across serverless instances (the in-memory
    // check above is only a cheap first pass). Fails open if not yet set up.
    if (await dbRateLimited(supabase, ip))
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });

    const { error } = await supabase
      .from("click_audit")
      .upsert(
        rows.map((r) => ({ ...r, country })),
        { onConflict: "event_uuid", ignoreDuplicates: true },
      );
    if (error) {
      // Table missing → tell the client to KEEP the outbox (don't mark delivered),
      // and surface a setup hint the way the error store does.
      if (/relation .*click_audit.* does not exist|could not find the table/i.test(error.message))
        return NextResponse.json({ error: "needs_setup", delivered: [] }, { status: 503, headers: CORS });
      return NextResponse.json({ error: error.message, delivered: [] }, { status: 500, headers: CORS });
    }
    return NextResponse.json({ ok: true, delivered }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }
}
