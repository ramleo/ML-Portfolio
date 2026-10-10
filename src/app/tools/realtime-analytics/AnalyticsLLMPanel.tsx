"use client";

import { useEffect, useState } from "react";

/** O3: LLM-call telemetry (lib/llmTelemetry.ts -> llm_calls -> /api/llm-stats).
 * Shows the headline numbers for every server-key LLM call in the range — cost,
 * success rate, tokens, p95 latency — and a per-provider breakdown as single-hue
 * magnitude bars (calls), with cost and p95 annotated. Content-free: counts and
 * timings only. Cost is an estimate from a dated price table, not a bill. */

const ACCENT = "#38bdf8"; // sky: the LLM/throughput panel, distinct from Errors' red
const GOOD = "#22c55e";
const BAD = "#e06c75";

type Provider = { provider: string; calls: number; errors: number; cost_usd: number; tokens: number; p95_ms: number | null };
type Stats = {
  total: number; ok: number; errors: number; success_rate: number | null;
  cost_usd: number; tokens: number; p95_ms: number | null;
  providers: Provider[]; needs_setup?: boolean;
};

interface Props {
  range: string;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
}

const fmtInt = (n: number) => n.toLocaleString("en-US");
const fmtCost = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const fmtMs = (n: number | null) => (n === null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] px-3 py-2" style={{ background: "var(--bg)" }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: "var(--text3)" }}>{label}</p>
      <p className="text-[15px] font-bold tabular-nums" style={{ color: color ?? "var(--text)" }}>{value}</p>
    </div>
  );
}

export default function AnalyticsLLMPanel({ range, customRange, rangeLabel }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const url = range === "custom" && customRange
      ? `/api/llm-stats?start=${customRange.start}&end=${customRange.end}`
      : `/api/llm-stats?range=${range}`;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then((d: Stats) => { if (!cancelled) { setStats(d); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [range, customRange]);

  if (!loaded) return null;

  if (stats?.needs_setup) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-2">LLM calls</p>
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Run <code style={{ color: ACCENT }}>supabase/llm_calls_o3.sql</code> in the Supabase SQL editor to enable per-call cost &amp; token telemetry.
        </p>
      </div>
    );
  }

  const maxCalls = Math.max(...(stats?.providers.map(p => p.calls) ?? [1]), 1);
  const sr = stats?.success_rate;
  const srColor = sr === null || sr === undefined ? "var(--text3)" : sr >= 0.98 ? GOOD : sr >= 0.9 ? ACCENT : BAD;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">LLM calls — {rangeLabel}</p>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: stats?.total ? ACCENT : "var(--text3)" }}>
          {fmtInt(stats?.total ?? 0)} calls
        </span>
      </div>

      {!stats || stats.total === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No LLM calls in this range.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Tile label="Cost (est.)" value={fmtCost(stats.cost_usd)} color={ACCENT} />
            <Tile label="Success" value={sr == null ? "—" : `${(sr * 100).toFixed(1)}%`} color={srColor} />
            <Tile label="Tokens" value={fmtInt(stats.tokens)} />
            <Tile label="p95 latency" value={fmtMs(stats.p95_ms)} />
          </div>

          <div className="flex flex-col gap-2.5">
            {stats.providers.map(p => (
              <div key={p.provider}>
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>
                    {p.provider}
                    {p.errors > 0 && (
                      <button type="button" title="Show these in the Activity Log"
                        onClick={() => window.dispatchEvent(new CustomEvent("airaml:activity-focus", { detail: { filter: "warn" } }))}
                        className="text-[10px] font-semibold ml-1.5 cursor-pointer underline-offset-2 hover:underline"
                        style={{ color: BAD }}>· {p.errors} err</button>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: "var(--text3)" }}>
                    {fmtInt(p.calls)} · {fmtCost(p.cost_usd)} · {fmtMs(p.p95_ms)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(p.calls / maxCalls) * 100}%`, background: ACCENT }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9.5px] mt-3" style={{ color: "var(--text3)" }}>
            Cost is estimated from a dated price table (free-tier providers = $0); only server-key calls are counted.
          </p>
        </>
      )}
    </div>
  );
}
