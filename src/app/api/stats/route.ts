import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function startOfDayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  try {
    const supabase = getClient();
    const todayStart = startOfDayUTC();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: todayEvents } = await supabase
      .from("events")
      .select("created_at, type, path, session_id, country, meta")
      .gte("created_at", todayStart);

    const today = todayEvents ?? [];

    // active_now
    const fiveMin = today.filter(e => e.created_at >= fiveMinAgo);
    const active_now = new Set(fiveMin.map(e => e.session_id).filter(Boolean)).size;

    // per_hour — sparkline bucketed by UTC hour across today
    const hourMap: Record<string, number> = {};
    for (const e of today) {
      const h = e.created_at.slice(11, 13) + ":00";
      hourMap[h] = (hourMap[h] ?? 0) + 1;
    }
    const per_minute = Object.entries(hourMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([minute, count]) => ({ minute, count }));

    // top_pages
    const pageMap: Record<string, number> = {};
    for (const e of today) if (e.path) pageMap[e.path] = (pageMap[e.path] ?? 0) + 1;
    const top_pages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // by_type
    const typeMap: Record<string, number> = {};
    for (const e of today) typeMap[e.type] = (typeMap[e.type] ?? 0) + 1;
    const by_type = Object.entries(typeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    // top_countries
    const countryMap: Record<string, number> = {};
    for (const e of today) if (e.country) countryMap[e.country] = (countryMap[e.country] ?? 0) + 1;
    const top_countries = Object.entries(countryMap)
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([country, count]) => ({ country, count }));

    // funnel
    const funnel = {
      page_view: today.filter(e => e.type === "page_view").length,
      tool_open: today.filter(e => e.type === "tool_open").length,
      query_run: today.filter(e => e.type === "query_run").length,
    };

    // query success rate
    const queryRuns = today.filter(e => e.type === "query_run");
    const successCount = queryRuns.filter(e => e.meta?.success === true).length;
    const query_success_rate = queryRuns.length > 0 ? Math.round((successCount / queryRuns.length) * 100) : null;

    return NextResponse.json({
      active_now,
      today_count: today.length,
      per_minute,
      top_pages,
      by_type,
      top_countries,
      funnel,
      query_success_rate,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}