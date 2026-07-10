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
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const fiveMinAgo   = new Date(Date.now() -  5 * 60 * 1000).toISOString();

    const [{ data: todayEvents }, { data: recentEvents }] = await Promise.all([
      supabase.from("events").select("type, path, session_id").gte("created_at", todayStart),
      supabase.from("events").select("created_at, type, path, session_id").gte("created_at", thirtyMinAgo),
    ]);

    const today = todayEvents ?? [];
    const recent = recentEvents ?? [];

    // active_now: distinct sessions in last 5 min
    const fiveMin = recent.filter(e => e.created_at >= fiveMinAgo);
    const active_now = new Set(fiveMin.map(e => e.session_id).filter(Boolean)).size;

    // per_minute buckets
    const minuteMap: Record<string, number> = {};
    for (const e of recent) {
      const m = e.created_at.slice(11, 16); // "HH:MM"
      minuteMap[m] = (minuteMap[m] ?? 0) + 1;
    }
    const per_minute = Object.entries(minuteMap)
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

    return NextResponse.json({
      active_now,
      today_count: today.length,
      per_minute,
      top_pages,
      by_type,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}