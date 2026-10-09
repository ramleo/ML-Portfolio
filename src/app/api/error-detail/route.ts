import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** O5/(A): per-page error log for the dashboard Page Inspector. The AnalyticsErrors
 * panel shows errors GROUPED by fingerprint; this returns the individual recent
 * occurrences for one route so you can read what actually happened on a page —
 * the in-app equivalent of tailing logs, scoped to one page. Content-free: time,
 * source, kind, the (truncated, provider-enriched) message, and the trace id.
 *
 *   GET /api/error-detail                 -> { routes: [{route, n}] } for the window
 *   GET /api/error-detail?route=/tools/x  -> { rows: [{...occurrence}] } recent first
 */

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "42703"
    || /schema cache/i.test(msg) || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

function getWindow(range: string, startParam: string | null, endParam: string | null): { start: string; end: string } {
  if (startParam) {
    return { start: `${startParam}T00:00:00.000Z`, end: `${endParam ?? startParam}T23:59:59.999Z` };
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

type ErrRow = {
  created_at: string; source: string | null; kind: string | null;
  message: string | null; route: string | null; meta: { trace_id?: string } | null;
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const range = sp.get("range") ?? "today";
    const route = sp.get("route");
    const { start, end } = getWindow(range, sp.get("start"), sp.get("end"));
    const supabase = getClient();

    // No route → the list of pages that had errors in the window (for the picker).
    if (!route) {
      const { data, error } = await supabase.from("errors")
        .select("route").gte("created_at", start).lte("created_at", end).limit(10000);
      if (error) return NextResponse.json({ routes: [], needs_setup: isMissingSchema(error) });
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as { route: string | null }[]) {
        const k = r.route || "(unknown)";
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const routes = [...counts.entries()].map(([route, n]) => ({ route, n })).sort((a, b) => b.n - a.n);
      return NextResponse.json({ routes });
    }

    // A route → its individual recent occurrences.
    const { data, error } = await supabase.from("errors")
      .select("created_at,source,kind,message,route,meta")
      .eq("route", route).gte("created_at", start).lte("created_at", end)
      .order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ rows: [], needs_setup: isMissingSchema(error) });
    const rows = ((data ?? []) as ErrRow[]).map(r => ({
      created_at: r.created_at,
      source: r.source ?? "",
      kind: r.kind ?? "Error",
      message: r.message ?? "",
      trace_id: r.meta?.trace_id ?? "",
    }));
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ rows: [], routes: [], error: (e as Error).message }, { status: 500 });
  }
}
