"use client";

import { useEffect, useState } from "react";

/** Q4 (Portkey-style budget) — month-to-date LLM spend vs a budget, with an
 * end-of-month projection. Reads /api/eval/budget (no new logging). */

interface Budget {
  needs_setup?: boolean; budget: number; mtd: number; projected: number;
  pct: number | null; projected_pct: number | null; day_of_month: number; days_in_month: number; month: string;
}

const usd = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "18px 20px" };
const WARN = "#f59e0b", ERR = "#f87171", OK = "var(--accent)";

export default function EvalBudget() {
  const [d, setD] = useState<Budget | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/eval/budget", { cache: "no-store" });
        if (!active) return;
        if (res.ok) setD(await res.json()); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, []);

  if (failed) return <div style={card}><p style={{ fontSize: 13, color: ERR, margin: 0 }}>Couldn&apos;t load budget.</p></div>;
  if (!d) return <div style={card}><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></div>;
  if (d.needs_setup) return <div style={card}><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No cost data yet.</p></div>;

  const pct = d.pct ?? 0;
  const color = pct >= 1 ? ERR : pct >= 0.8 || (d.projected_pct ?? 0) >= 1 ? WARN : OK;
  const over = pct >= 1, projOver = (d.projected_pct ?? 0) >= 1;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>Monthly budget <span style={{ color: "var(--text3)", fontWeight: 400 }}>· {d.month}</span></h3>
        <span style={{ fontSize: 12.5, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
          <strong style={{ color: "var(--text)" }}>{usd(d.mtd)}</strong> of {usd(d.budget)} · {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 12, background: "var(--bg)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: "100%", background: color, transition: "width .4s ease" }} />
        {/* projection marker */}
        {d.projected_pct != null && d.projected_pct > pct && d.projected_pct <= 1.2 && (
          <div title={`Projected: ${usd(d.projected)}`} style={{ position: "absolute", top: -2, bottom: -2, left: `${Math.min(100, Math.round((d.projected_pct) * 100))}%`, width: 2, background: "var(--text3)" }} />
        )}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "10px 0 0" }}>
        Day {d.day_of_month}/{d.days_in_month} · projected end-of-month <strong style={{ color: projOver ? WARN : "var(--text)" }}>{usd(d.projected)}</strong>
        {over ? <span style={{ color: ERR }}> · over budget</span> : projOver ? <span style={{ color: WARN }}> · on track to exceed budget</span> : <span style={{ color: "var(--text3)" }}> · within budget</span>}
        <span style={{ color: "var(--text3)" }}> · set via EVAL_MONTHLY_BUDGET_USD</span>
      </p>
    </div>
  );
}
