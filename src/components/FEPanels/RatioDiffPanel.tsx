"use client";

import React, { useState } from "react";
import { ColInfo } from "@/lib/feAlgorithms";

const ACCENT = "#34d399";

const SEL: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 7,
  color: "var(--text)",
  fontSize: "0.77rem",
  padding: "0.3rem 0.5rem",
  outline: "none",
  flex: 1,
  minWidth: 0,
};

interface RatioDiffPanelProps {
  numCols: ColInfo[];
  ratioDiffPairs: [string, string][];
  onAddPair: (a: string, b: string) => void;
  onRemovePair: (i: number) => void;
}

export default function RatioDiffPanel({ numCols, ratioDiffPairs, onAddPair, onRemovePair }: RatioDiffPanelProps) {
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");

  const handleAdd = () => {
    if (!colA || !colB || colA === colB) return;
    if (ratioDiffPairs.length >= 5) return;
    onAddPair(colA, colB);
    setColA(""); setColB("");
  };

  return (
    <div style={{ background: "rgba(14,22,40,0.72)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1.25rem 1.4rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        Ratio &amp; Difference Features
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.75rem" }}>
        Creates col_a_div_col_b (safe ratio) and col_a_minus_col_b for each selected pair.
      </div>
      {numCols.length === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No numeric columns available.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
            <select value={colA} onChange={e => setColA(e.target.value)} style={SEL}>
              <option value="">Col A</option>
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select value={colB} onChange={e => setColB(e.target.value)} style={SEL}>
              <option value="">Col B</option>
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={handleAdd} disabled={!colA || !colB || colA === colB || ratioDiffPairs.length >= 5}
              style={{ padding: "0.3rem 0.8rem", borderRadius: 7, fontSize: "0.75rem", fontWeight: 600, cursor: (!colA || !colB || colA === colB || ratioDiffPairs.length >= 5) ? "not-allowed" : "pointer", border: `1px solid ${ACCENT}40`, background: `${ACCENT}14`, color: ACCENT, flexShrink: 0, transition: "all 0.15s" }}>
              Add
            </button>
          </div>
          {ratioDiffPairs.length >= 5 && (
            <div style={{ fontSize: "0.67rem", color: "#f59e0b", marginBottom: "0.4rem" }}>Max 5 pairs</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {ratioDiffPairs.map(([a, b], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                <span style={{ color: ACCENT, fontFamily: "monospace" }}>{a}_div_{b}</span>
                <span style={{ color: "var(--text3)" }}>+</span>
                <span style={{ color: ACCENT, fontFamily: "monospace" }}>{a}_minus_{b}</span>
                <button onClick={() => onRemovePair(i)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.75rem", padding: "0 2px", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
                  x
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
