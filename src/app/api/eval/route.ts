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
  http_status: number | null; error_code: string | null; error_message: string | null;
}

/** Cluster failures by provider + reason (error code, else HTTP status) so a
 * recurring failure reads as one row with a count and a sample, not 44 lines.
 * Content-free: the sample is the provider's own error envelope (already
 * truncated at write time), never prompt or document text. */
function errorClusters(rows: Row[]) {
  const m = new Map<string, { provider: string; reason: string; count: number; lastTs: string | null; sample: string }>();
  for (const r of rows) {
    if (r.status === "ok") continue;
    const provider = r.provider || "unknown";
    const reason = r.error_code || (r.http_status ? `HTTP ${r.http_status}` : "error");
    const key = `${provider}|${reason}`;
    const a = m.get(key) ?? { provider, reason, count: 0, lastTs: null, sample: "" };
    a.count += 1;
    if (!a.lastTs || (r.ts && r.ts > a.lastTs)) { a.lastTs = r.ts; if (r.error_message) a.sample = r.error_message; }
    if (!a.sample && r.error_message) a.sample = r.error_message;
    m.set(key, a);
  }
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

/** Headline numbers for one window — used to compare the current window against
 * the one immediately before it (period-over-period deltas, feature C). */
function windowTotals(rows: Row[]) {
  const lat = rows.map(r => r.latency_ms).filter((n): n is number => typeof n === "number");
  const ok = rows.filter(r => r.status === "ok").length;
  return {
    calls: rows.length,
    success_rate: rows.length ? ok / rows.length : null,
    cost_usd: rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
    tokens: rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    p95_ms: percentile(lat, 0.95),
  };
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

  // Daily series (UTC), gap-filled for the whole window. p95 latency is kept
  // per day too, so cost and latency can be drawn as trend lines (feature C).
  const byDay = new Map<string, { calls: number; errors: number; cost: number; lat: number[] }>();
  for (const r of rows) {
    if (!r.ts) continue;
    const d = r.ts.slice(0, 10);
    const a = byDay.get(d) ?? { calls: 0, errors: 0, cost: 0, lat: [] };
    a.calls += 1; if (r.status !== "ok") a.errors += 1; a.cost += r.cost_usd ?? 0;
    if (typeof r.latency_ms === "number") a.lat.push(r.latency_ms);
    byDay.set(d, a);
  }
  const daily: { date: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const a = byDay.get(key) ?? { calls: 0, errors: 0, cost: 0, lat: [] };
    daily.push({ date: key, calls: a.calls, errors: a.errors, cost_usd: a.cost, p95_ms: percentile(a.lat, 0.95) });
  }

  return {
    total: rows.length,
    ok,
    errors: rows.length - ok,
    success_rate: rows.length ? ok / rows.length : null,
    cost_usd: rows.reduce((s, r) => s + (r.cost_usd ?? 0), 0),
    tokens: rows.reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0),
    tokens_in: rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0),
    tokens_out: rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0),
    p50_ms: percentile(lat, 0.5),
    p95_ms: percentile(lat, 0.95),
    p99_ms: percentile(lat, 0.99),
    daily,
    byTool: breakdown(rows, "tool"),
    byProvider: breakdown(rows, "provider"),
    byModel: breakdown(rows, "model"),
    byStatus: breakdown(rows, "status"),
    errorClusters: errorClusters(rows),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  const now = Date.now();
  const cutoff = new Date(now - days * 86_400_000);          // current window starts here
  const start = new Date(now - 2 * days * 86_400_000);        // fetch the previous window too

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("llm_calls")
    .select("ts,tool,provider,model,status,latency_ms,cost_usd,input_tokens,output_tokens,http_status,error_code,error_message")
    .gte("ts", start.toISOString())
    .order("ts", { ascending: false })
    .limit(10000);

  if (error) {
    if (isMissingSchema(error))
      return NextResponse.json({ needs_setup: true, days, ...summarize([], days) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Split into the current window and the one immediately before it. The
  // breakdowns/daily series are computed on the current window only; `prev` just
  // carries the previous window's headline totals for the delta chips.
  const all = (data ?? []) as Row[];
  const iso = cutoff.toISOString();
  const current = all.filter(r => r.ts != null && r.ts >= iso);
  const previous = all.filter(r => r.ts != null && r.ts < iso);
  return NextResponse.json({
    needs_setup: false, days,
    ...summarize(current, days),
    prev: windowTotals(previous),
  });
}
