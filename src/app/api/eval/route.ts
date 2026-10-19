import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 M1 — owner-only LLM evaluation/performance read. Aggregates the existing
 * llm_calls table (content-free: counts, timings, tokens, cost — never prompts)
 * over a window into totals + breakdowns by tool/provider/model/status + a daily
 * series. No new LLM spend; no schema change. The public /api/llm-stats covers a
 * lighter per-provider view; this is the deeper, private one. */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "42703" || /schema cache/i.test(msg)
    || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

interface Row {
  ts: string | null; tool: string | null; provider: string | null; model: string | null;
  status: string | null; latency_ms: number | null; cost_usd: number | null;
  input_tokens: number | null; output_tokens: number | null;
}

function breakdown(rows: Row[], key: keyof Row) {
  const m = new Map<string, { calls: number; errors: number; cost: number; lat: number[] }>();
  for (const r of rows) {
    const k = (r[key] as string) || "unknown";
    const a = m.get(k) ?? { calls: 0, errors: 0, cost: 0, lat: [] };
    a.calls += 1;
    if (r.status !== "ok") a.errors += 1;
    a.cost += r.cost_usd ?? 0;
    if (typeof r.latency_ms === "number") a.lat.push(r.latency_ms);
    m.set(k, a);
  }
  return [...m.entries()]
    .map(([name, a]) => ({ name, calls: a.calls, errors: a.errors, cost_usd: a.cost, p95_ms: percentile(a.lat, 0.95) }))
    .sort((a, b) => b.calls - a.calls);
}

function summarize(rows: Row[], days: number) {
  const lat = rows.map(r => r.latency_ms).filter((n): n is number => typeof n === "number");
  const ok = rows.filter(r => r.status === "ok").length;

  // Daily series (UTC), gap-filled for the whole window.
  const byDay = new Map<string, { calls: number; errors: number; cost: number }>();
  for (const r of rows) {
    if (!r.ts) continue;
    const d = r.ts.slice(0, 10);
    const a = byDay.get(d) ?? { calls: 0, errors: 0, cost: 0 };
    a.calls += 1; if (r.status !== "ok") a.errors += 1; a.cost += r.cost_usd ?? 0;
    byDay.set(d, a);
  }
  const daily: { date: string; calls: number; errors: number; cost_usd: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const a = byDay.get(key) ?? { calls: 0, errors: 0, cost: 0 };
    daily.push({ date: key, calls: a.calls, errors: a.errors, cost_usd: a.cost });
  }

  return {
    total: rows.length,
    ok,
    errors: rows.length - ok,
    success_rate: rows.length ? ok / rows.length : null,
    cost_usd: rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
    tokens: rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    p50_ms: percentile(lat, 0.5),
    p95_ms: percentile(lat, 0.95),
    daily,
    byTool: breakdown(rows, "tool"),
    byProvider: breakdown(rows, "provider"),
    byModel: breakdown(rows, "model"),
    byStatus: breakdown(rows, "status"),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("llm_calls")
    .select("ts,tool,provider,model,status,latency_ms,cost_usd,input_tokens,output_tokens")
    .gte("ts", start.toISOString())
    .order("ts", { ascending: false })
    .limit(5000);

  if (error) {
    if (isMissingSchema(error))
      return NextResponse.json({ needs_setup: true, days, ...summarize([], days) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ needs_setup: false, days, ...summarize((data ?? []) as Row[], days) });
}
