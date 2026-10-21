"use client";

import { useEffect, useState } from "react";
import { Panel } from "./charts/Panel";
import { C, PRIMARY, usd } from "./charts/format";

/** Month-to-date LLM spend vs a monthly budget, with an end-of-month projection.
 * Reads /api/eval/budget (no new logging). The bar fills with spend so far; the
 * dashed marker is where the month is projected to land. */

interface Budget {
  needs_setup?: boolean; budget: number; mtd: number; projected: number;
  pct: number | null; projected_pct: number | null; day_of_month: number; days_in_month: number; month: string;
}

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

  const info = "Total estimated LLM cost so far this month against your monthly budget (set via EVAL_MONTHLY_BUDGET_USD, default $10). The marker shows the projected end-of-month total at the current daily rate.";
  if (failed) return <Panel title="Monthly budget" info={info}><p style={{ fontSize: 13, color: C.err, margin: 0 }}>Couldn&apos;t load budget.</p></Panel>;
  if (!d) return <Panel title="Monthly budget" info={info}><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></Panel>;
  if (d.needs_setup) return <Panel title="Monthly budget" info={info}><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No cost data yet.</p></Panel>;

  const p = d.pct ?? 0;
  const over = p >= 1, projOver = (d.projected_pct ?? 0) >= 1;
  const color = over ? C.err : p >= 0.8 || projOver ? C.warn : PRIMARY;
  const projLeft = d.projected_pct != null ? Math.min(100, Math.round(d.projected_pct * 100)) : null;

  return (
    <Panel title={`Monthly budget · ${d.month}`} info={info}
      right={<span style={{ fontSize: 12.5, color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}><strong style={{ color: "var(--text)" }}>{usd(d.mtd)}</strong> of {usd(d.budget)} · {Math.round(p * 100)}%</span>}>
      {/* The full track = your monthly budget; the fill = spend so far; the flag = projection. */}
      <div style={{ position: "relative", paddingTop: 16 }}>
        <div style={{ height: 16, background: C.track, borderRadius: 8, overflow: "hidden" }}>
          <div className="ev-grow" style={{ width: `${Math.max(Math.min(100, p * 100), p > 0 ? 2 : 0)}%`, height: "100%", background: color, borderRadius: 8 }} title={`Spent so far: ${usd(d.mtd)}`} />
        </div>
        {projLeft != null && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${projLeft}%`, transform: projLeft > 88 ? "translateX(-100%)" : "none" }}>
            <div style={{ position: "absolute", top: 16, bottom: 0, left: 0, width: 2, background: projOver ? C.warn : "var(--text2)" }} />
            <span style={{ position: "absolute", top: 0, left: projLeft > 88 ? "auto" : 0, right: projLeft > 88 ? 0 : "auto", transform: projLeft > 88 ? "none" : "translateX(-50%)", fontSize: 10.5, color: projOver ? C.warn : "var(--text3)", whiteSpace: "nowrap" }}>proj {usd(d.projected)}</span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0 0", fontSize: 11, color: "var(--text3)", fontVariantNumeric: "tabular-nums" }}>
        <span>$0</span><span>budget {usd(d.budget)}</span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "8px 0 0" }}>
        Day {d.day_of_month} of {d.days_in_month} · spent <strong style={{ color: "var(--text)" }}>{usd(d.mtd)}</strong> · projected end-of-month <strong style={{ color: projOver ? C.warn : "var(--text)" }}>{usd(d.projected)}</strong>
        {over ? <span style={{ color: C.err }}> · over budget</span> : projOver ? <span style={{ color: C.warn }}> · on track to exceed budget</span> : <span style={{ color: "var(--text3)" }}> · within budget</span>}
      </p>
    </Panel>
  );
}
