"use client";

import React, { useState } from "react";
import { ColInfo, NUM_TRANSFORMS } from "@/lib/feAlgorithms";

const SEARCH_INPUT_STYLE: React.CSSProperties = {
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
};

const ACCENT = "#38bdf8";

// ── Mini histogram (SVG, pure browser) ───────────────────────────────────────

function MiniHistogram({ values, bins = 14, width = 66, height = 22, color = ACCENT }: {
  values: (number | null)[];
  bins?: number; width?: number; height?: number; color?: string;
}) {
  const valid = values.filter(v => v !== null) as number[];
  if (valid.length === 0) return <svg width={width} height={height} />;
  const min = Math.min(...valid), max = Math.max(...valid);
  const range = max - min || 1;
  const counts = new Array(bins).fill(0);
  for (const v of valid) counts[Math.min(Math.floor(((v - min) / range) * bins), bins - 1)]++;
  const maxCount = Math.max(...counts, 1);
  const bw = width / bins;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {counts.map((c, i) => {
        const h = (c / maxCount) * height;
        return <rect key={i} x={i * bw + 0.5} y={height - h} width={Math.max(bw - 1, 1)} height={Math.max(h, 0.5)} fill={color} rx={0.5} />;
      })}
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NumericTransformsPanelProps {
  numCols: ColInfo[];
  colTransforms: Record<string, string[]>;
  onToggleTransform: (col: string, key: string) => void;
  onToggleAllTransform: (key: string, on: boolean) => void;
  onClearAll: () => void;
  onAiSuggest: () => void;
  aiSuggestLoading: boolean;
  aiSuggestError: string | null;
  squareCols: string[];
  onToggleSquareCol: (col: string) => void;
  binConfigs: Record<string, number>;
  onToggleBinCol: (col: string, bins: number) => void;
  onRemoveBinCol: (col: string) => void;
}

export default function NumericTransformsPanel({
  numCols, colTransforms, onToggleTransform, onToggleAllTransform, onClearAll,
  onAiSuggest, aiSuggestLoading, aiSuggestError,
  squareCols, onToggleSquareCol, binConfigs, onToggleBinCol, onRemoveBinCol,
}: NumericTransformsPanelProps) {
  const [colSearch, setColSearch] = useState("");
  const visibleCols = colSearch.trim()
    ? numCols.filter(c => c.name.toLowerCase().includes(colSearch.toLowerCase()))
    : numCols;

  const squareCandidates = numCols.filter(c => c.nunique > 5);
  const binCandidates = numCols.filter(c => c.nunique > 10);

  return (
    <div style={{ background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.25rem 1.4rem" }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Numeric Column Transforms
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button onClick={onClearAll} title="Clear all selected transforms"
              style={{ padding: "3px 11px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: "pointer", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "var(--text3)", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; }}>
              Clear all
            </button>
            <button onClick={onAiSuggest} disabled={aiSuggestLoading} title="Use AI to suggest transforms based on column statistics"
              style={{ display: "flex", alignItems: "center", gap: "0.28rem", padding: "3px 11px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: aiSuggestLoading ? "default" : "pointer", border: `1px solid ${ACCENT}40`, background: `${ACCENT}0d`, color: aiSuggestLoading ? `${ACCENT}66` : ACCENT, transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={e => { if (!aiSuggestLoading) (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}1a`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ACCENT}0d`; }}>
              {aiSuggestLoading ? "Analysing..." : "AI Suggest"}
            </button>
          </div>
        </div>
        {aiSuggestError && <div style={{ fontSize: "0.63rem", color: "#f87171", marginTop: "0.35rem", textAlign: "right" }}>{aiSuggestError}</div>}
      </div>

      {numCols.length === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No numeric columns detected.</div>
      ) : (
        <>
          {numCols.length >= 8 && (
            <input type="text" placeholder="Search columns..." value={colSearch} onChange={e => setColSearch(e.target.value)} style={SEARCH_INPUT_STYLE} />
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 118 }} />
              <col style={{ width: 84 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: "0 0 0.6rem", textAlign: "left", fontSize: "0.59rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Apply to all</th>
                <th style={{ padding: "0 0 0.6rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }} />
                <th style={{ padding: "0 0 0.6rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {NUM_TRANSFORMS.map(t => {
                      const allOn = numCols.length > 0 && numCols.every(c => (colTransforms[c.name] ?? []).includes(t.key));
                      const anyOn = numCols.some(c => (colTransforms[c.name] ?? []).includes(t.key));
                      return (
                        <button key={t.key} onClick={() => onToggleAllTransform(t.key, !allOn)} title={t.hint}
                          style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${allOn ? ACCENT : anyOn ? `${ACCENT}50` : "rgba(255,255,255,0.1)"}`, background: allOn ? `${ACCENT}1e` : anyOn ? `${ACCENT}09` : "rgba(255,255,255,0.03)", color: allOn ? ACCENT : anyOn ? `${ACCENT}99` : "var(--text3)", transition: "all 0.12s" }}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCols.map((col, i) => {
                const selected = colTransforms[col.name] ?? [];
                const skewAbs = Math.abs(col.skew);
                const skewColor = skewAbs > 1.5 ? "#f59e0b" : skewAbs > 0.5 ? "#94a3b8" : "#34d399";
                const border = i < visibleCols.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none";
                return (
                  <tr key={col.name}>
                    <td style={{ padding: "0.5rem 0", borderBottom: border, verticalAlign: "middle" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={col.name}>{col.name}</div>
                      {col.missing > 0 && <div style={{ fontSize: "0.59rem", color: "#f87171" }}>{col.missing} missing</div>}
                    </td>
                    <td style={{ padding: "0.4rem 0.3rem", borderBottom: border, verticalAlign: "middle", textAlign: "center" }}>
                      <MiniHistogram values={col.values} bins={14} width={66} height={22} color={`${skewColor}99`} />
                      <div style={{ fontSize: "0.6rem", fontWeight: 700, color: skewColor, marginTop: "0.1rem" }}>skew {col.skew.toFixed(1)}</div>
                    </td>
                    <td style={{ padding: "0.5rem 0", borderBottom: border, verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {NUM_TRANSFORMS.map(t => {
                          const on = selected.includes(t.key);
                          return (
                            <button key={t.key} onClick={() => onToggleTransform(col.name, t.key)} title={t.hint}
                              style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? ACCENT : "rgba(255,255,255,0.1)"}`, background: on ? `${ACCENT}1a` : "rgba(255,255,255,0.03)", color: on ? ACCENT : "var(--text3)", transition: "all 0.12s", boxShadow: on ? `0 0 7px ${ACCENT}30` : "none" }}>
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {squareCandidates.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.59rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.45rem" }}>Polynomial: x&#178; Squares</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {squareCandidates.map(col => {
                  const on = squareCols.includes(col.name);
                  return (
                    <button key={col.name} onClick={() => onToggleSquareCol(col.name)}
                      style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? ACCENT : "rgba(255,255,255,0.1)"}`, background: on ? `${ACCENT}1a` : "rgba(255,255,255,0.03)", color: on ? ACCENT : "var(--text3)", transition: "all 0.12s", boxShadow: on ? `0 0 7px ${ACCENT}30` : "none" }}>
                      {col.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {binCandidates.length > 0 && (
            <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.59rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.45rem" }}>Custom Binning</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {binCandidates.map(col => {
                  const active = col.name in binConfigs;
                  const nBins = binConfigs[col.name] ?? 5;
                  return (
                    <div key={col.name} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <button onClick={() => active ? onRemoveBinCol(col.name) : onToggleBinCol(col.name, nBins)}
                        style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? "#a78bfa" : "rgba(255,255,255,0.1)"}`, background: active ? "#a78bfa1a" : "rgba(255,255,255,0.03)", color: active ? "#a78bfa" : "var(--text3)", transition: "all 0.12s" }}>
                        {col.name}
                      </button>
                      {active && (
                        <input type="number" min={3} max={20} value={nBins}
                          onChange={e => onToggleBinCol(col.name, Math.min(20, Math.max(3, parseInt(e.target.value) || 5)))}
                          style={{ width: 42, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "var(--text)", fontSize: "0.72rem", padding: "1px 4px", outline: "none" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
