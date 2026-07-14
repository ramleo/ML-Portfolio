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
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - 7);
      return { start: d.toISOString() };
    }
    case "30d": {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - 30);
      return { start: d.toISOString() };
    }
    default: {
      const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
      return { start: d.toISOString() };
    }
  }
}

// Group referrers by hostname + pathname (not just domain, not full URL with params)
function refKey(ref: string): string {
  try {
    const u = new URL(ref);
    const path = u.pathname === "/" ? "" : u.pathname;
    return u.hostname.replace(/^www\./, "") + path;
  } catch { return ref; }
}

export async function GET(req: NextRequest) {
  try {
    const range      = req.nextUrl.searchParams.get("range") ?? "today";
    const startParam = req.nextUrl.searchParams.get("start");
    const endParam   = req.nextUrl.searchParams.get("end");

    let start: string, end: string | undefined, is_range: boolean, useDay: boolean;

    if (startParam) {
      start    = `${startParam}T00:00:00.000Z`;
      end      = `${endParam ?? startParam}T23:59:59.999Z`;
      is_range = startParam !== (endParam ?? startParam);
      useDay   = is_range;
    } else {
      const w  = getRangeWindow(range);
      start    = w.start;
      end      = w.end;
      is_range = range !== "today";
      useDay   = range === "7d" || range === "30d";
    }

    const supabase  = getClient();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let query = supabase
      .from("events")
      .select("created_at, type, path, session_id, country, meta, referrer, duration_ms")
      .gte("created_at", start);
    if (end) query = query.lte("created_at", end);

    const { data: rangeEvents } = await query;
    const events = rangeEvents ?? [];

    // active_now (today) / unique_sessions (other ranges)
    const active_now = !is_range
      ? new Set(events.filter(e => e.created_at >= fiveMinAgo).map(e => e.session_id).filter(Boolean)).size
      : new Set(events.map(e => e.session_id).filter(Boolean)).size;

    // sparkline buckets
    const bucketMap: Record<string, number> = {};
    for (const e of events) {
      const key = useDay ? e.created_at.slice(0, 10) : e.created_at.slice(11, 13) + ":00";
      bucketMap[key] = (bucketMap[key] ?? 0) + 1;
    }
    const per_minute = Object.entries(bucketMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([minute, count]) => ({ minute, count }));

    // error sparkline buckets (same bucketing as per_minute)
    const errorBucketMap: Record<string, number> = {};
    for (const e of events.filter(ev => ev.type === "error")) {
      const key = useDay ? e.created_at.slice(0, 10) : e.created_at.slice(11, 13) + ":00";
      errorBucketMap[key] = (errorBucketMap[key] ?? 0) + 1;
    }
    const error_per_minute = Object.entries(errorBucketMap)
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

    // top_referrers — grouped by hostname+pathname (page-level granularity, no query params)
    const refMap: Record<string, number> = {};
    for (const e of events) if (e.referrer) {
      const k = refKey(e.referrer);
      refMap[k] = (refMap[k] ?? 0) + 1;
    }
    const top_referrers = Object.entries(refMap)
      .sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([referrer, count]) => ({ referrer, count }));

    // funnel
    const funnel = {
      page_view: events.filter(e => e.type === "page_view").length,
      tool_open: events.filter(e => e.type === "tool_open").length,
      query_run: events.filter(e => e.type === "query_run").length,
    };

    // avg session duration from tool_close events
    const toolCloses = events.filter(e => e.type === "tool_close" && (e.duration_ms ?? 0) > 0);
    const avg_session_duration_ms = toolCloses.length > 0
      ? Math.round(toolCloses.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) / toolCloses.length)
      : null;

    // bounce rate: sessions with exactly 1 event
    const sessionEventCount: Record<string, number> = {};
    for (const e of events) if (e.session_id) sessionEventCount[e.session_id] = (sessionEventCount[e.session_id] ?? 0) + 1;
    const sessionCounts = Object.values(sessionEventCount);
    const bounceSessions = sessionCounts.filter(c => c === 1).length;
    const bounce_rate = sessionCounts.length > 0 ? Math.round((bounceSessions / sessionCounts.length) * 100) : null;

    // query success rate (overall)
    const queryRuns    = events.filter(e => e.type === "query_run");
    const successCount = queryRuns.filter(e => e.meta?.success === true).length;
    const query_success_rate = queryRuns.length > 0 ? Math.round((successCount / queryRuns.length) * 100) : null;

    // per-tool query success rate
    const toolMap: Record<string, { success: number; total: number }> = {};
    for (const e of queryRuns) {
      const key = e.path ?? "unknown";
      if (!toolMap[key]) toolMap[key] = { success: 0, total: 0 };
      toolMap[key].total++;
      if (e.meta?.success === true) toolMap[key].success++;
    }
    const query_by_tool = Object.entries(toolMap)
      .map(([path, { success, total }]) => ({
        path, success_count: success, total_count: total,
        success_rate: Math.round((success / total) * 100),
      }))
      .sort((a, b) => b.total_count - a.total_count);

    // Export conversion: % of sessions that ran a query AND exported
    const sessionsThatQueried = new Set(queryRuns.map(e => e.session_id).filter(Boolean));
    const sessionsThatExported = new Set(
      events.filter(e => e.type === "export").map(e => e.session_id).filter(Boolean)
    );
    const exportedAndQueried = [...sessionsThatExported].filter(s => sessionsThatQueried.has(s)).length;
    const export_conversion_pct = sessionsThatQueried.size > 0
      ? Math.round((exportedAndQueried / sessionsThatQueried.size) * 100)
      : null;

    // Avg query length (chars) from query_run meta
    const queryLengths = queryRuns.map(e => Number(e.meta?.query_length)).filter(n => n > 0 && !isNaN(n));
    const avg_query_length = queryLengths.length > 0
      ? Math.round(queryLengths.reduce((a, b) => a + b, 0) / queryLengths.length)
      : null;

    // Avg queries per session from tool_close meta
    const toolClosesWithCount = events.filter(e => e.type === "tool_close" && typeof e.meta?.queries_run === "number");
    const avg_queries_per_session = toolClosesWithCount.length > 0
      ? Math.round((toolClosesWithCount.reduce((s, e) => s + Number(e.meta!.queries_run), 0) / toolClosesWithCount.length) * 10) / 10
      : null;

    // Provider breakdown from query_run meta
    const providerMap: Record<string, number> = {};
    for (const e of queryRuns) {
      const p = typeof e.meta?.provider === "string" ? e.meta.provider : null;
      if (p) providerMap[p] = (providerMap[p] ?? 0) + 1;
    }
    const provider_breakdown = Object.entries(providerMap)
      .sort(([, a], [, b]) => b - a)
      .map(([provider, count]) => ({ provider, count }));

    // Model breakdown from query_run meta
    const modelMap: Record<string, number> = {};
    for (const e of queryRuns) {
      const m = typeof e.meta?.model === "string" ? e.meta.model : null;
      if (m) modelMap[m] = (modelMap[m] ?? 0) + 1;
    }
    const model_breakdown = Object.entries(modelMap)
      .sort(([, a], [, b]) => b - a)
      .map(([model, count]) => ({ model, count }));

    // Error events count
    const error_count = events.filter(e => e.type === "error").length;

    // Device breakdown + returning visitor rate from page_view meta
    const deviceMap: Record<string, number> = {};
    let returningSum = 0, newVisitorSum = 0;
    for (const e of events.filter(ev => ev.type === "page_view")) {
      const d = typeof e.meta?.device === "string" ? e.meta.device : null;
      if (d) deviceMap[d] = (deviceMap[d] ?? 0) + 1;
      if (e.meta?.returning === true) returningSum++;
      else if (e.meta?.returning === false) newVisitorSum++;
    }
    const device_breakdown = Object.entries(deviceMap).sort(([, a], [, b]) => b - a).map(([device, count]) => ({ device, count }));
    const returning_pct = (returningSum + newVisitorSum) > 0
      ? Math.round((returningSum / (returningSum + newVisitorSum)) * 100)
      : null;

    // Previous period count (same duration, shifted back) for trend delta
    const rangeMs = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    const prevStart = new Date(new Date(start).getTime() - rangeMs).toISOString();
    const prevEnd   = new Date(start).toISOString();
    const { count: prev_period_count } = await supabase
      .from("events").select("id", { count: "exact", head: true })
      .gte("created_at", prevStart).lt("created_at", prevEnd);

    // 7-day hourly heatmap (always fixed window, independent of range)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: heatmapRows } = await supabase
      .from("events").select("created_at").gte("created_at", sevenDaysAgo);
    const heatMap: Record<string, number> = {};
    for (const e of heatmapRows ?? []) {
      const d = new Date(e.created_at);
      const key = `${d.getUTCDay()}-${d.getUTCHours()}`;
      heatMap[key] = (heatMap[key] ?? 0) + 1;
    }
    const heatmap = Object.entries(heatMap).map(([k, count]) => {
      const [day, hour] = k.split("-").map(Number);
      return { day, hour, count };
    });
    const hourTotals: Record<number, number> = {};
    for (const { hour, count } of heatmap) hourTotals[hour] = (hourTotals[hour] ?? 0) + count;
    const peak_hour = Object.keys(hourTotals).length > 0
      ? Number(Object.entries(hourTotals).sort(([,a],[,b]) => b - a)[0][0])
      : null;

    return NextResponse.json({
      active_now, is_range, today_count: events.length,
      per_minute, error_per_minute, top_pages, by_type, top_countries, top_referrers, funnel,
      avg_session_duration_ms,
      bounce_rate, bounce_session_count: bounceSessions, total_session_count: sessionCounts.length,
      query_success_rate, query_success_count: successCount, query_total_count: queryRuns.length,
      query_by_tool,
      prev_period_count: prev_period_count ?? 0,
      heatmap,
      peak_hour,
      provider_breakdown,
      model_breakdown,
      error_count,
      device_breakdown,
      returning_pct,
      avg_query_length,
      avg_queries_per_session,
      export_conversion_pct,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}