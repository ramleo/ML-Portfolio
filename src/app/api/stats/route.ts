import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getRangeWindow(range: string): { start: string; end?: string } {
  const now = new Date();
  switch (range) {
    case "yesterday": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 1);
      d.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 999);
      return { start: d.toISOString(), end: end.toISOString() };
    }
    case "7d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 7);
      return { start: d.toISOString() };
    }
    case "30d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 30);
      return { start: d.toISOString() };
    }
    default: {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return { start: d.toISOString() };
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const { start, end } = getRangeWindow(range);
    const supabase = getClient();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let query = supabase
      .from("events")
      .select("created_at, type, path, session_id, country, meta, referrer")
      .gte("created_at", start);
    if (end) query = query.lte("created_at", end);

    const { data: rangeEvents } = await query;
    const events = rangeEvents ?? [];

    // active_now for today; unique sessions for other ranges
    const is_range = range !== "today";
    const active_now = is_range
      ? new Set(events.map(e => e.session_id).filter(Boolean)).size
      : new Set(events.filter(e => e.created_at >= fiveMinAgo).map(e => e.session_id).filter(Boolean)).size;

    // sparkline — hour bucket for today/yesterday, day bucket for 7d/30d
    const useDay = range === "7d" || range === "30d";
    const bucketMap: Record<string, number> = {};
    for (const e of events) {
      const key = useDay ? e.created_at.slice(0, 10) : e.created_at.slice(11, 13) + ":00";
      bucketMap[key] = (bucketMap[key] ?? 0) + 1;
    }
    const per_minute = Object.entries(bucketMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([minute, count]) => ({ minute, count }));

    // top_pages
    const pageMap: Record<string, number> = {};
    for (const e of events) if (e.path) pageMap[e.path] = (pageMap[e.path] ?? 0) + 1;
    const top_pages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // by_type
    const typeMap: Record<string, number> = {};
    for (const e of events) typeMap[e.type] = (typeMap[e.type] ?? 0) + 1;
    const by_type = Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    // top_countries
    const countryMap: Record<string, number> = {};
    for (const e of events) if (e.country) countryMap[e.country] = (countryMap[e.country] ?? 0) + 1;
    const top_countries = Object.entries(countryMap)
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    // top_referrers
    const refMap: Record<string, number> = {};
    for (const e of events) if (e.referrer) refMap[e.referrer] = (refMap[e.referrer] ?? 0) + 1;
    const top_referrers = Object.entries(refMap)
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([referrer, count]) => ({ referrer, count }));

    // funnel
    const funnel = {
      page_view: events.filter(e => e.type === "page_view").length,
      tool_open: events.filter(e => e.type === "tool_open").length,
      query_run: events.filter(e => e.type === "query_run").length,
    };

    // query success rate
    const queryRuns = events.filter(e => e.type === "query_run");
    const successCount = queryRuns.filter(e => e.meta?.success === true).length;
    const query_success_rate = queryRuns.length > 0 ? Math.round((successCount / queryRuns.length) * 100) : null;

    return NextResponse.json({
      active_now,
      is_range,
      today_count: events.length,
      per_minute,
      top_pages,
      by_type,
      top_countries,
      top_referrers,
      funnel,
      query_success_rate,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}