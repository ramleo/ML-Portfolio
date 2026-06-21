"use client";

import { useState } from "react";
import { AnalyzeResult, fmtNum, missingColor, skewBadge } from "@/lib/preprocessingAlgorithms";
import { MiniDistChart } from "./MiniDistChart";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

export function DatasetOverview({ analyzed }: { analyzed: AnalyzeResult }) {
  const [open, setOpen] = useState(true);
  const numCols = analyzed.columns.filter(c => c.is_numeric);
  const catCols = analyzed.columns.filter(c => !c.is_numeric);
  const colsWithMissing = analyzed.columns.filter(c => c.missing > 0).sort((a, b) => b.missing - a.missing);

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.65rem 1rem", background: CARD_BG, border: "none", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Dataset Overview
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 600, background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
            {numCols.length} numeric
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 600, background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
            {catCols.length} categorical
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Missing values — always visible, above the collapsible body */}
      {colsWithMissing.length > 0 && (
        <div style={{ padding: "0.85rem 1rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(11,17,32,0.5)" }}>
          <div style={{ fontSize: "0.63rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem", fontWeight: 600 }}>
            Missing Values
            <span style={{ marginLeft: "0.5rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.7 }}>({colsWithMissing.length} column{colsWithMissing.length > 1 ? "s" : ""})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {colsWithMissing.slice(0, 10).map(col => {
              const pct = Math.round((col.missing / analyzed.rows) * 100);
              const clr = missingColor(pct);
              return (
                <div key={col.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.73rem", fontWeight: 500, color: "var(--text)", width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 9999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(pct, 2)}%`, background: clr, borderRadius: 9999, transition: "width 0.5s ease", boxShadow: `0 0 6px ${clr}66` }} />
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: clr, width: 68, flexShrink: 0, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{col.missing} <span style={{ fontWeight: 400, opacity: 0.8 }}>({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1.1rem", background: "rgba(11,17,32,0.6)" }}>

          {numCols.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Numeric Distributions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {numCols.slice(0, 12).map(col => {
                  const badge = skewBadge(col.skew ?? 0);
                  const missingPct = analyzed.rows > 0 ? Math.round((col.missing / analyzed.rows) * 100) : 0;
                  return (
                    <div key={col.name} style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.55rem 0.85rem", borderRadius: 10,
                      background: "rgba(11,17,32,0.7)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ width: 96, flexShrink: 0 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 2 }}>{col.nunique} unique{missingPct > 0 ? ` · ${missingPct}% missing` : ""}</div>
                      </div>
                      <MiniDistChart col={col} width={160} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.67rem", fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}>
                          <span><span style={{ color: "var(--text3)" }}>min </span><span style={{ color: "var(--text2)" }}>{fmtNum(col.min ?? 0)}</span></span>
                          <span><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: ACCENT, fontWeight: 700 }}>{fmtNum(col.mean ?? 0)}</span></span>
                          <span><span style={{ color: "var(--text3)" }}>max </span><span style={{ color: "var(--text2)" }}>{fmtNum(col.max ?? 0)}</span></span>
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>std {fmtNum(col.std ?? 0)} · {badge.desc}</div>
                      </div>
                      <span style={{ fontSize: "0.62rem", padding: "2px 8px", borderRadius: 9999, flexShrink: 0, background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}33`, fontWeight: 600 }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
                {numCols.length > 12 && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center" }}>+{numCols.length - 12} more numeric columns</div>
                )}
              </div>
            </div>
          )}

          {catCols.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.55rem" }}>Categorical Columns</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {catCols.slice(0, 12).map(col => (
                  <div key={col.name} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: "0.7rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}>
                    {col.name}<span style={{ opacity: 0.6, marginLeft: 4 }}>{col.nunique} unique</span>
                  </div>
                ))}
                {catCols.length > 12 && <div style={{ fontSize: "0.68rem", color: "var(--text3)", padding: "3px 6px" }}>+{catCols.length - 12} more</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
