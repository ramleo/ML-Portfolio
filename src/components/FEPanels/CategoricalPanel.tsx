"use client";

import React, { useState } from "react";
import { ColInfo, DATE_PARTS, getTopValues } from "@/lib/feAlgorithms";

const ACCENT = "#38bdf8";

export interface CategoricalPanelProps {
  catCols: ColInfo[];
  freqCols: string[];
  dateCols: string[];
  dateParts: string[];
  onToggleFreqCol: (col: string) => void;
  onToggleDateCol: (col: string) => void;
  onToggleDatePart: (part: string) => void;
}

export default function CategoricalPanel({
  catCols,
  freqCols,
  dateCols,
  dateParts,
  onToggleFreqCol,
  onToggleDateCol,
  onToggleDatePart,
}: CategoricalPanelProps) {
  const [colSearch, setColSearch] = useState("");
  if (catCols.length === 0) return null;

  const visibleCols = colSearch.trim()
    ? catCols.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()))
    : catCols;

  return (
    <div style={{ background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.25rem 1.4rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
        Categorical Columns
      </div>
      {catCols.length >= 8 && (
        <input
          type="text"
          placeholder="Search columns…"
          value={colSearch}
          onChange={e => setColSearch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7,
            color: "var(--text)",
            fontSize: "0.77rem",
            padding: "0.35rem 0.6rem",
            outline: "none",
            marginBottom: "0.75rem",
            boxSizing: "border-box",
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {visibleCols.map((col, ci) => {
          const topVals = getTopValues(col, 6);
          const isFreqOn = freqCols.includes(col.name);
          const isDateOn = dateCols.includes(col.name);
          const maxPct = topVals[0]?.pct ?? 1;
          const border = ci < visibleCols.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none";
          return (
            <div key={col.name} style={{ paddingTop: ci === 0 ? 0 : "1rem", paddingBottom: "1rem", borderBottom: border }}>
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.55rem" }}>
                <span style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--text)" }}>{col.name}</span>
                <span style={{ fontSize: "0.66rem", color: "var(--text3)" }}>
                  {col.nunique} unique{col.missing > 0 ? ` · ${col.missing} missing` : ""}
                </span>
              </div>
              {/* Distribution bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.26rem", marginBottom: "0.7rem" }}>
                {topVals.map(v => (
                  <div key={v.value} style={{ display: "grid", gridTemplateColumns: "130px 1fr 40px", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.71rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.value}>
                      {v.value}
                    </span>
                    <div style={{ height: 5, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(v.pct / maxPct) * 100}%`,
                        borderRadius: 9999,
                        background: isFreqOn ? ACCENT : "rgba(99,153,219,0.45)",
                        transition: "background 0.2s, width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: "0.68rem", color: isFreqOn ? ACCENT : "var(--text3)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: isFreqOn ? 700 : 400, transition: "color 0.2s" }}>
                      {(v.pct * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
                {col.nunique > 6 && (
                  <span style={{ fontSize: "0.62rem", color: "var(--text3)", paddingLeft: "0.1rem" }}>
                    + {col.nunique - 6} more values
                  </span>
                )}
              </div>
              {/* Action chips */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => onToggleFreqCol(col.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.32rem",
                    padding: "3px 10px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${isFreqOn ? ACCENT : "rgba(255,255,255,0.12)"}`,
                    background: isFreqOn ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
                    color: isFreqOn ? ACCENT : "var(--text3)",
                    transition: "all 0.13s",
                  }}>
                  {isFreqOn ? "✓" : "○"} Freq Encoding
                  <span style={{ fontFamily: "monospace", fontSize: "0.63rem", opacity: 0.8 }}>→ {col.name}_freq</span>
                </button>
                <button
                  onClick={() => onToggleDateCol(col.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.32rem",
                    padding: "3px 10px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${isDateOn ? "#a78bfa" : "rgba(255,255,255,0.12)"}`,
                    background: isDateOn ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                    color: isDateOn ? "#a78bfa" : "var(--text3)",
                    transition: "all 0.13s",
                  }}>
                  {isDateOn ? "✓" : "○"} Date Extract
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Date parts selector — shown when any date col is active */}
      {dateCols.length > 0 && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: "0.66rem", color: "var(--text3)", marginBottom: "0.4rem" }}>Parts to extract from date columns:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {DATE_PARTS.map(p => (
              <button key={p.key}
                onClick={() => onToggleDatePart(p.key)}
                style={{ padding: "3px 9px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${dateParts.includes(p.key) ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                  background: dateParts.includes(p.key) ? "rgba(167,139,250,0.12)" : "transparent",
                  color: dateParts.includes(p.key) ? "#a78bfa" : "var(--text3)",
                  transition: "all 0.13s" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}