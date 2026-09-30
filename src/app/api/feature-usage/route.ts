import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Feature-usage aggregation for the analytics dashboard (FEATURE_TRACKING_SPEC.md
 * Phase 3). Calls the `feature_usage` Supabase RPC, which does the GROUP BY
 * server-side — so this route returns a small grouped result, never the raw
 * (highest-volume) `feature_use` rows. Read-only, content-free. */

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Same range semantics as /api/stats. */
function getWindow(range: string, startParam: string | null, endParam: string | null): { start: string; end: string } {
  if (startParam) {
    return {
      start: `${startParam}T00:00:00.000Z`,
      end: `${endParam ?? startParam}T23:59:59.999Z`,
    };
  }
  const now = new Date();
  if (range === "yesterday") {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0, 0, 0, 0);
    const e = new Date(d); e.setUTCHours(23, 59, 59, 999);
    return { start: d.toISOString(), end: e.toISOString() };
  }
  if (range === "7d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 7); return { start: d.toISOString(), end: now.toISOString() }; }
  if (range === "30d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 30); return { start: d.toISOString(), end: now.toISOString() }; }
  const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
  return { start: d.toISOString(), end: now.toISOString() };
}

type Row = { tool: string; control: string; action: string; value: string | null; n: number };

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const { start, end } = getWindow(
      range,
      req.nextUrl.searchParams.get("start"),
      req.nextUrl.searchParams.get("end"),
    );

    const supabase = getClient();
    const { data, error } = await supabase.rpc("feature_usage", { p_start: start, p_end: end });

    if (error) {
      // Most likely the RPC isn't installed yet — see supabase/feature_usage.sql.
      // Supabase reports a missing function as PGRST202 / "Could not find … in the
      // schema cache" — match code AND message to be robust.
      const needsSetup = error.code === "PGRST202"
        || /schema cache/i.test(error.message) || /could not find/i.test(error.message) || /does not exist/i.test(error.message);
      return NextResponse.json({ rows: [], error: error.message, needs_setup: needsSetup });
    }

    const rows = (data ?? []) as Row[];
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ rows: [], error: (e as Error).message }, { status: 500 });
  }
}
