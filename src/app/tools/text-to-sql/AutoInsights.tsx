"use client";

import { useMemo, useState } from "react";

interface Props {
  columns: string[];
  rows: unknown[][];
}

type Severity = "warn" | "info" | "note";
type InsightType = "null" | "outlier" | "dominant" | "unique_key" | "constant" | "skew";

interface Insight {
  col: string;
  type: InsightType;
  text: string;
  severity: Severity;
}

const SEVERITY_STYLE: Record<Severity, { border: string; bg: string; badge: string; dot: string }> = {
  warn:  { border: "border-amber-500/30",  bg: "bg-amber-500/8",   badge: "bg-amber-500/15 text-amber-300",   dot: "bg-amber-400" },
  info:  { border: "border-indigo-500/25", bg: "bg-indigo-500/6",  badge: "bg-indigo-500/15 text-indigo-300",  dot: "bg-indigo-400" },
  note:  { border: "border-[var(--border)]",      bg: "bg-white/[0.03]",  badge: "bg-[var(--bg-glass)] text-gray-400",         dot: "bg-gray-500" },
};

function InsightIcon({ type }: { type: InsightType }) {
  if (type === "null") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 4l4 4M8 4L4 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (type === "outlier") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l5 9H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M6 5v2.5M6 9v.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (type === "dominant") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="7" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="4.5" y="4" width="2" height="7" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="8" y="1" width="2" height="10" rx="0.5" fill="currentColor"/>
    </svg>
  );
  if (type === "unique_key") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="4.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6.5 5h4.5M9 3.5V5M10.5 5v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (type === "constant") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M2 4h8M2 8h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M1 10L6 2l5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 7.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function computeInsights(columns: string[], rows: unknown[][]): Insight[] {
  const n = rows.length;
  if (n < 4) return [];
  const scored: (Insight & { score: number })[] = [];

  columns.forEach((col, ci) => {
    const vals = rows.map(r => (r as unknown[])[ci]);
    const nullCount = vals.filter(v => v === null || v === undefined || v === "").length;
    const nullPct = nullCount / n;

    if (nullPct > 0.05) {
      scored.push({
        col, type: "null", severity: nullPct > 0.3 ? "warn" : "info",
        text: `${Math.round(nullPct * 100)}% null (${nullCount} of ${n})`,
        score: nullPct * 100,
      });
    }

    const nonNull = vals.filter(v => v !== null && v !== undefined && v !== "");
    if (nonNull.length === 0) return;

    const distinct = new Set(nonNull.map(v => String(v)));

    if (distinct.size === 1) {
      scored.push({ col, type: "constant", severity: "note", text: `constant — every row = "${[...distinct][0]}"`, score: 30 });
      return;
    }

    if (distinct.size === n) {
      scored.push({ col, type: "unique_key", severity: "info", text: `100% distinct — likely a key`, score: 20 });
      return;
    }

    const freq = new Map<string, number>();
    nonNull.forEach(v => { const k = String(v); freq.set(k, (freq.get(k) ?? 0) + 1); });
    const [topVal, topCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    const dominance = topCount / nonNull.length;
    if (dominance > 0.4) {
      scored.push({
        col, type: "dominant", severity: "info",
        text: `"${String(topVal).slice(0, 24)}" in ${Math.round(dominance * 100)}% of rows`,
        score: dominance * 50,
      });
    }

    const nums = nonNull.map(v => Number(v)).filter(v => !isNaN(v));
    if (nums.length > 2 && nums.length / nonNull.length > 0.8) {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      if (std > 0) {
        const out = nums.filter(v => Math.abs(v - mean) > 2.5 * std);
        if (out.length > 0 && out.length < n * 0.1) {
          const fmt = (v: number) => Math.abs(v) > 999 ? v.toLocaleString() : String(+(v.toFixed(2)));
          scored.push({
            col, type: "outlier", severity: "warn",
            text: `${out.length} outlier${out.length > 1 ? "s" : ""} — ${fmt(Math.min(...out))} to ${fmt(Math.max(...out))}`,
            score: (out.length / n) * 60 + 25,
          });
        }
        const min = Math.min(...nums), max = Math.max(...nums);
        if (min > 0 && max / min > 100) {
          scored.push({
            col, type: "skew", severity: "info",
            text: `range ${min.toLocaleString()} → ${max.toLocaleString()} (${Math.round(max / min)}× spread)`,
            score: 15,
          });
        }
      }
    }
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map(({ score: _, ...rest }) => rest);
}

export default function AutoInsights({ columns, rows }: Props) {
  const insights = useMemo(() => computeInsights(columns, rows), [columns, rows]);
  const [open, setOpen] = useState(true);

  if (insights.length === 0) return null;

  const warns = insights.filter(i => i.severity === "warn").length;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-[var(--bg-glass)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0 text-emerald-400">
          <path d="M7 1l1.5 4H13l-3.5 2.5 1.3 4L7 9l-3.8 2.5L4.5 7.5 1 5h4.5L7 1z" fill="currentColor" opacity="0.8"/>
        </svg>
        <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest">Auto-Insights</span>
        <span className="text-[10px] text-emerald-600">{insights.length} found</span>
        {warns > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400 font-medium">
            {warns} warning{warns > 1 ? "s" : ""}
          </span>
        )}
        <svg width="9" height="9" viewBox="0 0 8 8" fill="none" className={`ml-auto text-[var(--text3)] transition-transform ${open ? "" : "-rotate-90"}`}>
          <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((ins, i) => {
            const s = SEVERITY_STYLE[ins.severity];
            return (
              <div key={i} className={`flex items-start gap-2.5 rounded-lg border ${s.border} ${s.bg} px-3 py-2`}>
                <span className={`mt-0.5 shrink-0 ${ins.severity === "warn" ? "text-amber-400" : ins.severity === "info" ? "text-indigo-400" : "text-gray-500"}`}>
                  <InsightIcon type={ins.type} />
                </span>
                <div className="min-w-0">
                  <span className={`inline-block text-[9px] font-semibold rounded px-1.5 py-0.5 mb-0.5 font-mono ${s.badge}`}>
                    {ins.col}
                  </span>
                  <p className="text-[11px] text-[var(--text)] leading-snug">{ins.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}