import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Click-audit lookup — the dispute query (Plan #2).
 *
 * Answers "did <actor> click <control> between <start> and <end>?" via the
 * click_audit_lookup() RPC. Empty rows = they did not; a row = they did, with the
 * exact browser timestamp.
 *
 * Unlike the content-free analytics reads, audit rows name an actor and their
 * actions, so this endpoint is GATED by a shared secret (AUDIT_ADMIN_KEY) and
 * FAILS CLOSED: with no key configured it refuses, so it is never accidentally
 * world-readable. Set AUDIT_ADMIN_KEY in the environment and pass it as the
 * `x-audit-key` header (or `?key=`).
 */

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const configured = process.env.AUDIT_ADMIN_KEY;
  if (!configured)
    return NextResponse.json({ error: "audit lookup not configured (set AUDIT_ADMIN_KEY)" }, { status: 503 });
  const provided = req.headers.get("x-audit-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  if (provided !== configured)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const actor = sp.get("actor") ?? "";
  const control = sp.get("control") ?? ""; // optional: blank = timeline of every click
  if (!actor)
    return NextResponse.json({ error: "actor required" }, { status: 400 });

  // Default window: the last 24h, overridable with ISO start/end.
  const now = Date.now();
  const start = sp.get("start") ?? new Date(now - 24 * 3600 * 1000).toISOString();
  const end = sp.get("end") ?? new Date(now).toISOString();

  try {
    const supabase = getClient();
    // Query the table directly so `control` can be optional (timeline mode shows
    // every interactive click; a control filters to one). Service role bypasses RLS.
    let q = supabase
      .from("click_audit")
      .select("event_uuid, actor, control, path, client_ts, created_at, meta")
      .eq("actor", actor)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (control) q = q.eq("control", control);
    const { data, error } = await q;
    if (error) {
      if (/does not exist|could not find/i.test(error.message))
        return NextResponse.json({ error: "needs_setup" }, { status: 503 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rows = data ?? [];
    return NextResponse.json({
      actor,
      control: control || null,
      mode: control ? "control" : "timeline",
      window: { start, end },
      clicked: rows.length > 0,
      count: rows.length,
      rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
