import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** O3: LLM-call telemetry read view for the analytics dashboard. Aggregates the
 * llm_calls table (written per call by lib/llmTelemetry.ts) over a time window:
 * total calls, success rate, estimated cost, tokens, p95 latency, and a
 * per-provider breakdown. Content-free — counts and timings only, never prompts.
 * Mirrors /api/error's windowing and missing-schema handling. */

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** True when llm_calls or the O3 columns aren't there yet (migration not run). */
function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "42703" || /schema cache/i.test(msg)
    || /could not find/i.test(msg) || /does not exist/i.test(msg);
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

type Row = {
  provider: string | null; status: string | null; latency_ms: number | null;
  cost_usd: number | null; input_tokens: number | null; output_tokens: number | null;
};

/** p95 (or any percentile) of a numeric list, or null when empty. */
function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[i];
}

function summarize(rows: Row[]) {
  const latencies = rows.map(r => r.latency_ms).filter((n): n is number => typeof n === "number");
  const ok = rows.filter(r => r.status === "ok").length;
  const byProvider = new Map<string, { calls: number; errors: number; cost_usd: number; tokens: number; lat: number[] }>();
  for (const r of rows) {
    const key = r.provider || "unknown";
    const agg = byProvider.get(key) ?? { calls: 0, errors: 0, cost_usd: 0, tokens: 0, lat: [] };
    agg.calls += 1;
    if (r.status !== "ok") agg.errors += 1;
    agg.cost_usd += r.cost_usd ?? 0;
    agg.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    if (typeof r.latency_ms === "number") agg.lat.push(r.latency_ms);
    byProvider.set(key, agg);
  }
  const providers = [...byProvider.entries()]
    .map(([provider, a]) => ({
      provider, calls: a.calls, errors: a.errors,
      cost_usd: a.cost_usd, tokens: a.tokens, p95_ms: percentile(a.lat, 0.95),
    }))
    .sort((a, b) => b.calls - a.calls);

  return {
    total: rows.length,
    ok,
    errors: rows.length - ok,
    success_rate: rows.length ? ok / rows.length : null,
    cost_usd: rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
    tokens: rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    p95_ms: percentile(latencies, 0.95),
    providers,
  };
}

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const { start, end } = getWindow(range, req.nextUrl.searchParams.get("start"), req.nextUrl.searchParams.get("end"));
    // 5000 most-recent calls in the window bound the read; a portfolio's volume
    // is far below that, so the aggregate is exact in practice.
    const { data, error } = await getClient()
      .from("llm_calls")
      .select("provider,status,latency_ms,cost_usd,input_tokens,output_tokens")
      .gte("created_at", start).lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      return NextResponse.json({ needs_setup: isMissingSchema(error), error: error.message, ...summarize([]) });
    }
    return NextResponse.json({ needs_setup: false, ...summarize((data ?? []) as Row[]) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, ...summarize([]) }, { status: 500 });
  }
}
