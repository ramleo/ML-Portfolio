import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 (live RAG health) — owner read over rag_queries: cache-hit rate, answer-source
 * mix, groundedness (avg + daily drift), low-confidence and web-fallback rates. All
 * content-free (the log never held query text). Feeds the RAG health section. */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? ""; const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

interface Row {
  ts: string | null; cache_hit: boolean | null; answer_source: string | null;
  groundedness: number | null; low_confidence: boolean | null; web_fallback: boolean | null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days);

  const admin = createAdminClient();
  const { data, error } = await admin.from("rag_queries")
    .select("ts,cache_hit,answer_source,groundedness,low_confidence,web_fallback")
    .gte("ts", start.toISOString()).order("ts", { ascending: false }).limit(10000);

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ needs_setup: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const n = rows.length;
  const g = rows.map(r => r.groundedness).filter((x): x is number => typeof x === "number");
  const sources = new Map<string, number>();
  for (const r of rows) {
    const k = r.answer_source || "none";
    sources.set(k, (sources.get(k) ?? 0) + 1);
  }

  // Daily average groundedness (gap-filled) for the drift line.
  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.ts || typeof r.groundedness !== "number") continue;
    const d = r.ts.slice(0, 10);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(r.groundedness);
  }
  const daily: { date: string; groundedness: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const vals = byDay.get(key);
    daily.push({ date: key, groundedness: vals && vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null });
  }

  return NextResponse.json({
    needs_setup: false, days, total: n,
    cache_hit_rate: n ? rows.filter(r => r.cache_hit).length / n : null,
    low_confidence_rate: n ? rows.filter(r => r.low_confidence).length / n : null,
    web_fallback_rate: n ? rows.filter(r => r.web_fallback).length / n : null,
    avg_groundedness: g.length ? g.reduce((s, v) => s + v, 0) / g.length : null,
    sources: [...sources.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    daily,
  });
}
