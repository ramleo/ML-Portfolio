import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** O5: SLO scorecard (OBSERVABILITY_PLAN.md). One content-free read that both the
 * dashboard tile (AnalyticsSLO.tsx) and the slo-watch GitHub Action consume, so
 * there is a single source of truth for "are we meeting our targets".
 *
 * Four SLIs, computed over a window from the two tables we already write:
 *   1. LLM success rate   — llm_calls ok/total              (higher is better)
 *   2. LLM p95 latency    — llm_calls.latency_ms            (lower is better)
 *   3. Backend 5xx count  — errors where source=backend     (lower is better)
 *   4. Frontend err count — errors where source=frontend    (lower is better)
 *
 * Honest limits (documented, not hidden): the count SLOs are a fast-burn signal
 * (count over a short window past a threshold), not Google-SRE multi-window
 * burn-rate — overkill for this volume. Ratio SLOs stay "insufficient" (never
 * breach) until MIN_SAMPLE calls exist, so a quiet window never shows false red.
 * Count targets scale linearly with the window so a 30-min poll and a 7d
 * dashboard view both judge against the same underlying rate.
 */

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** True when a table/column isn't there yet (a migration hasn't run). */
function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "PGRST202" || code === "42703"
    || /schema cache/i.test(msg) || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

const BASE_WINDOW_S = 1800; // 30 min — the rate basis for the count SLOs
const MIN_SAMPLE = 20;      // ratio SLOs need at least this many calls to judge

/** Window from either ?window_seconds=N (the Action) or ?range / ?start&end
 * (the dashboard, mirroring /api/llm-stats). Returns ISO bounds + its length. */
function getWindow(sp: URLSearchParams): { start: string; end: string; seconds: number } {
  const now = new Date();
  const ws = Number(sp.get("window_seconds"));
  if (Number.isFinite(ws) && ws > 0) {
    const d = new Date(now.getTime() - ws * 1000);
    return { start: d.toISOString(), end: now.toISOString(), seconds: ws };
  }
  const startParam = sp.get("start");
  if (startParam) {
    const endParam = sp.get("end") ?? startParam;
    const start = `${startParam}T00:00:00.000Z`;
    const end = `${endParam}T23:59:59.999Z`;
    return { start, end, seconds: (Date.parse(end) - Date.parse(start)) / 1000 };
  }
  const range = sp.get("range") ?? "today";
  let start: Date;
  if (range === "yesterday") {
    start = new Date(now); start.setUTCDate(start.getUTCDate() - 1); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), seconds: 86400 };
  }
  if (range === "7d") { start = new Date(now); start.setUTCDate(start.getUTCDate() - 7); }
  else if (range === "30d") { start = new Date(now); start.setUTCDate(start.getUTCDate() - 30); }
  else { start = new Date(now); start.setUTCHours(0, 0, 0, 0); }
  return { start: start.toISOString(), end: now.toISOString(), seconds: (now.getTime() - start.getTime()) / 1000 };
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[i];
}

type Status = "ok" | "warn" | "breach" | "insufficient";

/** ok ≥ warn > target for "up"; ok ≤ warn < target for "down". `warn` is the
 * amber band between green and the breach line. */
function statusFor(dir: "up" | "down", value: number, target: number, warn: number): Status {
  if (dir === "up") return value < target ? "breach" : value < warn ? "warn" : "ok";
  return value > target ? "breach" : value > warn ? "warn" : "ok";
}

type Slo = {
  id: string; label: string; dir: "up" | "down"; type: "ratio" | "latency" | "count";
  value: number | null; target: number; warn: number; unit: string; sample: number; status: Status;
};

export async function GET(req: NextRequest) {
  try {
    const { start, end, seconds } = getWindow(req.nextUrl.searchParams);
    const scale = Math.max(seconds / BASE_WINDOW_S, 1 / 48); // count targets scale with window
    const supabase = getClient();
    let needsSetup = false;

    // 1–2: LLM success rate + p95 latency
    // NB: llm_calls' timestamp column is `ts`, the errors table's is `created_at`.
    const llm = await supabase.from("llm_calls")
      .select("status,latency_ms").gte("ts", start).lte("ts", end).limit(5000);
    if (llm.error && isMissingSchema(llm.error)) needsSetup = true;
    const llmRows = (llm.data ?? []) as { status: string | null; latency_ms: number | null }[];
    const total = llmRows.length;
    const ok = llmRows.filter(r => r.status === "ok").length;
    const successRate = total ? ok / total : null;
    const p95 = percentile(llmRows.map(r => r.latency_ms).filter((n): n is number => typeof n === "number"), 0.95);

    // 3–4: backend / frontend error counts
    const errs = await supabase.from("errors")
      .select("source").gte("created_at", start).lte("created_at", end).limit(10000);
    if (errs.error && isMissingSchema(errs.error)) needsSetup = true;
    const errRows = (errs.data ?? []) as { source: string | null }[];
    const backendErrors = errRows.filter(r => r.source === "backend").length;
    const frontendErrors = errRows.filter(r => r.source === "frontend").length;

    const backendTarget = Math.round(10 * scale);
    const frontendTarget = Math.round(20 * scale);

    const slos: Slo[] = [
      {
        id: "llm_success", label: "LLM success rate", dir: "up", type: "ratio",
        value: successRate, target: 0.98, warn: 0.99, unit: "ratio", sample: total,
        status: total < MIN_SAMPLE ? "insufficient"
          : statusFor("up", successRate ?? 1, 0.98, 0.99),
      },
      {
        id: "llm_p95", label: "LLM p95 latency", dir: "down", type: "latency",
        value: p95, target: 12000, warn: 8000, unit: "ms", sample: total,
        status: total < MIN_SAMPLE || p95 === null ? "insufficient"
          : statusFor("down", p95, 12000, 8000),
      },
      {
        id: "backend_errors", label: "Backend errors", dir: "down", type: "count",
        value: backendErrors, target: backendTarget, warn: Math.round(6 * scale), unit: "count", sample: backendErrors,
        status: statusFor("down", backendErrors, backendTarget, Math.round(6 * scale)),
      },
      {
        id: "frontend_errors", label: "Frontend errors", dir: "down", type: "count",
        value: frontendErrors, target: frontendTarget, warn: Math.round(12 * scale), unit: "count", sample: frontendErrors,
        status: statusFor("down", frontendErrors, frontendTarget, Math.round(12 * scale)),
      },
    ];

    const breached = slos.filter(s => s.status === "breach").map(s => s.id);
    return NextResponse.json({ needs_setup: needsSetup, window_seconds: Math.round(seconds), slos, breached });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, slos: [], breached: [] }, { status: 500 });
  }
}
