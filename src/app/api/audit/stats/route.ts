import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Click-audit stats — aggregate feed for the internal dashboard (/audit/dashboard).
 *
 * Unlike /api/audit/lookup (one actor's rows), this returns counts GROUPed in the
 * DB via the click_audit_stats() RPC: totals, top controls/paths/actors/countries,
 * a time series, and a recent feed for a window. The client never pulls raw rows.
 *
 * Audit data names actors, so this is GATED by the same shared secret as the
 * lookup (AUDIT_ADMIN_KEY) and FAILS CLOSED: with no key configured it refuses, so
 * the dashboard is never accidentally world-readable. Pass the key as the
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
    return NextResponse.json({ error: "audit stats not configured (set AUDIT_ADMIN_KEY)" }, { status: 503 });
  const provided = req.headers.get("x-audit-key") ?? req.nextUrl.searchParams.get("key") ?? "";
  if (provided !== configured)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  // Default window: the last 24h, overridable with ISO start/end.
  const now = Date.now();
  const start = sp.get("start") ?? new Date(now - 24 * 3600 * 1000).toISOString();
  const end = sp.get("end") ?? new Date(now).toISOString();
  // Bucket the time series by hour by default; use day for windows wider than ~2 days.
  const bucket = sp.get("bucket") === "day" ? "day" : "hour";

  try {
    const supabase = getClient();
    const { data, error } = await supabase.rpc("click_audit_stats", {
      p_start: start,
      p_end: end,
      p_bucket: bucket,
    });
    if (error) {
      if (/does not exist|could not find/i.test(error.message))
        return NextResponse.json({ error: "needs_setup" }, { status: 503 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ window: { start, end }, bucket, stats: data ?? {} });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
