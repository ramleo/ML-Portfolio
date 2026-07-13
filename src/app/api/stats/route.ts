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
      .select("created_at, type, path, session_id, country, meta, referrer")
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

    // bounce rate: sessions with exactly 1 event
    const sessionEventCount: Record<string, number> = {};
    for (const e of events) if (e.session_id) sessionEventCount[e.session_id] = (sessionEventCount[e.session_id] ?? 0) + 1;
    const sessionCounts = Object.values(sessionEventCount);
    const bounceSessions = sessionCounts.filter(c => c === 1).length;
    const bounce_rate = sessionCounts.length > 0 ? Math.round((bounceSessions / sessionCounts.length) * 100) : null;

    // query success rate
    const queryRuns    = events.filter(e => e.type === "query_run");
    const successCount = queryRuns.filter(e => e.meta?.success === true).length;
    const query_success_rate = queryRuns.length > 0 ? Math.round((successCount / queryRuns.length) * 100) : null;

    return NextResponse.json({
      active_now, is_range, today_count: events.length,
      per_minute, top_pages, by_type, top_countries, top_referrers, funnel,
      bounce_rate, bounce_session_count: bounceSessions, total_session_count: sessionCounts.length,
      query_success_rate, query_success_count: successCount, query_total_count: queryRuns.length,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}