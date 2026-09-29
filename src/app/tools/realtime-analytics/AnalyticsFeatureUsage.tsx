"use client";

import { useEffect, useMemo, useState } from "react";
import { pathLabel } from "./AnalyticsQueryByTool";

/** Phase 3 (FEATURE_TRACKING_SPEC.md): per-tool control usage, read from the
 * `feature_usage` Supabase RPC via /api/feature-usage. Single-hue magnitude bars
 * (one series → no categorical-palette concern); value breakdowns as labelled
 * chips. Content-free throughout. */

const ACCENT = "#7c8cf8";

type Row = { tool: string; control: string; action: string; value: string | null; n: number };

interface Props {
  range: string;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
}

export default function AnalyticsFeatureUsage({ range, customRange, rangeLabel }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState<string | null>(null);

  useEffect(() => {
    const url = range === "custom" && customRange
      ? `/api/feature-usage?start=${customRange.start}&end=${customRange.end}`
      : `/api/feature-usage?range=${range}`;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then((d: { rows?: Row[]; needs_setup?: boolean }) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        setNeedsSetup(!!d.needs_setup);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [range, customRange]);

  // tools ranked by total interactions
  const tools = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) totals[r.tool] = (totals[r.tool] ?? 0) + r.n;
    return Object.entries(totals).sort(([, a], [, b]) => b - a).map(([t]) => t);
  }, [rows]);

  const selected = tool && tools.includes(tool) ? tool : tools[0] ?? null;

  // controls for the selected tool, ranked; with per-value breakdown + action mix
  const controls = useMemo(() => {
    if (!selected) return [];
    const map: Record<string, { total: number; actions: Record<string, number>; values: Record<string, number> }> = {};
    for (const r of rows) {
      if (r.tool !== selected) continue;
      const c = (map[r.control] ??= { total: 0, actions: {}, values: {} });
      c.total += r.n;
      c.actions[r.action] = (c.actions[r.action] ?? 0) + r.n;
      if (r.value != null && r.value !== "") c.values[r.value] = (c.values[r.value] ?? 0) + r.n;
    }
    return Object.entries(map)
      .map(([control, v]) => ({ control, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [rows, selected]);

  if (!loaded) return null;

  if (needsSetup) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-2">Feature Usage</p>
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Run <code style={{ color: ACCENT }}>supabase/feature_usage.sql</code> in the Supabase SQL editor to enable this panel.
        </p>
      </div>
    );
  }
  if (rows.length === 0 || !selected) return null;

  const max = Math.max(...controls.map(c => c.total), 1);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">
          Feature Usage — {rangeLabel}
        </p>
        <select
          value={selected}
          onChange={e => setTool(e.target.value)}
          aria-label="Tool"
          className="text-[11px] rounded border px-2 py-1"
          style={{ background: "var(--bg-glass)", borderColor: "var(--border2)", color: "var(--text)" }}
        >
          {tools.map(t => <option key={t} value={t}>{pathLabel(`/tools/${t}`)}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-2.5">
        {controls.map(c => {
          const valueChips = Object.entries(c.values).sort(([, a], [, b]) => b - a);
          return (
            <div key={c.control}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>{c.control}</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT }}>{c.total}</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(c.total / max) * 100}%`, background: ACCENT }} />
              </div>
              {valueChips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {valueChips.map(([v, n]) => (
                    <span key={v} className="text-[8px] tabular-nums px-1.5 py-[1px] rounded-full"
                      style={{ background: `${ACCENT}18`, color: "var(--text2)", border: "1px solid var(--border)" }}>
                      {v} · {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
