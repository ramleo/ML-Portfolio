"use client";

import React from "react";
import { ColInfo } from "@/lib/feAlgorithms";

const ACCENT = "#38bdf8";

const SELECT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.78rem",
  padding: "0.35rem 0.4rem",
  outline: "none",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 30, height: 16, borderRadius: 9999, cursor: "pointer", flexShrink: 0,
      background: checked ? ACCENT : "rgba(255,255,255,0.12)", position: "relative",
      transition: "background 0.2s", boxShadow: checked ? `0 0 6px ${ACCENT}55` : "none",
    }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 16 : 2, width: 12, height: 12, borderRadius: 9999, background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.67rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.7rem" }}>
      {children}
    </div>
  );
}

export interface SidebarPanelProps {
  filename: string;
  rawRows: string[][];
  cols: ColInfo[];
  numCols: ColInfo[];
  // Interactions
  interactions: [string, string][];
  interactA: string;
  interactB: string;
  onSetInteractA: (v: string) => void;
  onSetInteractB: (v: string) => void;
  onAddInteraction: () => void;
  onRemoveInteraction: (i: number) => void;
  // Ratios
  ratios: [string, string][];
  ratioA: string;
  ratioB: string;
  onSetRatioA: (v: string) => void;
  onSetRatioB: (v: string) => void;
  onAddRatio: () => void;
  onRemoveRatio: (i: number) => void;
  // Polynomial
  polyCols: string[];
  onTogglePolyCols: (col: string) => void;
  // Cyclical
  cyclicCols: Record<string, number>;
  onToggleCyclicCol: (col: string) => void;
  onSetCyclicPeriod: (col: string, period: number) => void;
  // Row aggregates
  rowAggCols: string[];
  rowAggFn: string;
  onToggleRowAggCol: (col: string) => void;
  onSetRowAggFn: (fn: string) => void;
  // Time-series
  sortCol: string;
  onSetSortCol: (col: string) => void;
  lagCols: string[];
  lagN: number;
  lagDiff: boolean;
  onToggleLagCol: (col: string) => void;
  onSetLagN: (n: number) => void;
  onToggleLagDiff: () => void;
  rollCols: string[];
  rollN: number;
  rollAgg: string;
  onToggleRollCol: (col: string) => void;
  onSetRollN: (n: number) => void;
  onSetRollAgg: (agg: string) => void;
}

export default function SidebarPanel({
  filename, rawRows, cols, numCols,
  interactions, interactA, interactB, onSetInteractA, onSetInteractB, onAddInteraction, onRemoveInteraction,
  ratios, ratioA, ratioB, onSetRatioA, onSetRatioB, onAddRatio, onRemoveRatio,
  polyCols, onTogglePolyCols,
  cyclicCols, onToggleCyclicCol, onSetCyclicPeriod,
  rowAggCols, rowAggFn, onToggleRowAggCol, onSetRowAggFn,
  sortCol, onSetSortCol,
  lagCols, lagN, lagDiff, onToggleLagCol, onSetLagN, onToggleLagDiff,
  rollCols, rollN, rollAgg, onToggleRollCol, onSetRollN, onSetRollAgg,
}: SidebarPanelProps) {
  return (
    <div style={{ width: 278, flexShrink: 0, overflowY: "auto", paddingBottom: "1rem", background: "rgba(10,18,35,0.88)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>

      {/* Dataset stats */}
      <div style={{ padding: "1.1rem 1.3rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {filename}
        </div>
        <div style={{ display: "flex", gap: "1.6rem" }}>
          {[
            { label: "rows",    value: (rawRows.length - 1).toLocaleString() },
            { label: "cols",    value: String(cols.length) },
            { label: "numeric", value: String(numCols.length) },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: ACCENT, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginTop: "0.22rem" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Combinations */}
      <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <SideLabel>Column Combinations</SideLabel>

        {/* A × B */}
        <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
          Multiply (A × B) → <span style={{ color: ACCENT, fontFamily: "monospace" }}>colA_x_colB</span>
        </div>
        <div style={{ display: "flex", gap: "0.35rem", marginBottom: interactions.length > 0 ? "0.4rem" : "0.55rem" }}>
          <select value={interactA} onChange={e => onSetInteractA(e.target.value)} style={SELECT_STYLE}>
            <option value="">Col A</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.85rem", flexShrink: 0 }}>×</span>
          <select value={interactB} onChange={e => onSetInteractB(e.target.value)} style={SELECT_STYLE}>
            <option value="">Col B</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={onAddInteraction} disabled={!interactA || !interactB || interactA === interactB}
            style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "var(--text)", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 700, fontSize: "1rem", cursor: (!interactA || !interactB || interactA === interactB) ? "not-allowed" : "pointer", opacity: (!interactA || !interactB || interactA === interactB) ? 0.3 : 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            +
          </button>
        </div>
        {interactions.map(([a, b], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.2rem 0.55rem", background: `${ACCENT}0c`, borderRadius: 5, marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.72rem", color: ACCENT, fontWeight: 600 }}>{a} × {b}</span>
            <button onClick={() => onRemoveInteraction(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0.65rem 0" }} />

        {/* A ÷ B */}
        <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
          Divide (A ÷ B) → <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>colA_div_colB</span>
        </div>
        <div style={{ display: "flex", gap: "0.35rem", marginBottom: ratios.length > 0 ? "0.4rem" : 0 }}>
          <select value={ratioA} onChange={e => onSetRatioA(e.target.value)} style={SELECT_STYLE}>
            <option value="">Col A</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.85rem", flexShrink: 0 }}>÷</span>
          <select value={ratioB} onChange={e => onSetRatioB(e.target.value)} style={SELECT_STYLE}>
            <option value="">Col B</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button onClick={onAddRatio} disabled={!ratioA || !ratioB || ratioA === ratioB}
            style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "var(--text)", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 700, fontSize: "1rem", cursor: (!ratioA || !ratioB || ratioA === ratioB) ? "not-allowed" : "pointer", opacity: (!ratioA || !ratioB || ratioA === ratioB) ? 0.3 : 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            +
          </button>
        </div>
        {ratios.map(([a, b], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.2rem 0.55rem", background: "rgba(167,139,250,0.08)", borderRadius: 5, marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#a78bfa", fontWeight: 600 }}>{a} ÷ {b}</span>
            <button onClick={() => onRemoveRatio(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
      </div>

      {/* Polynomial cross-terms */}
      <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <SideLabel>Polynomial Cross-Terms</SideLabel>
        <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.55rem", lineHeight: 1.5 }}>
          Generates every pairwise A×B product for the selected columns.
          {polyCols.length >= 2 && (
            <span style={{ color: ACCENT }}> → {polyCols.length * (polyCols.length - 1) / 2} new column{polyCols.length * (polyCols.length - 1) / 2 > 1 ? "s" : ""}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
          {numCols.map(c => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <Toggle checked={polyCols.includes(c.name)} onChange={() => onTogglePolyCols(c.name)} />
              <span style={{ fontSize: "0.78rem", color: polyCols.includes(c.name) ? "var(--text)" : "var(--text3)" }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cyclical Encoding */}
      {numCols.length > 0 && (
        <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SideLabel>Cyclical Encoding</SideLabel>
          <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.55rem", lineHeight: 1.6 }}>
            Wraps a periodic number onto a circle so that the ends connect — month 12 and month 1 become neighbors, not 11 steps apart. Outputs a <span style={{ color: `${ACCENT}cc` }}>_sin</span> and <span style={{ color: `${ACCENT}cc` }}>_cos</span> column per feature. Set the period to the cycle length (e.g. 12 for months, 24 for hours, 7 for days of week).
            <br /><span style={{ color: `${ACCENT}99`, fontStyle: "italic" }}>Use on: hour of day in taxi/energy data, month in sales forecasts, day-of-week in retail — any column where the last value wraps back to the first.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {numCols.map(c => {
              const period = cyclicCols[c.name];
              const isOn = period !== undefined;
              return (
                <div key={c.name}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Toggle checked={isOn} onChange={() => onToggleCyclicCol(c.name)} />
                    <span style={{ fontSize: "0.78rem", color: isOn ? "var(--text)" : "var(--text3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    {isOn && (
                      <select value={period} onChange={e => onSetCyclicPeriod(c.name, Number(e.target.value))}
                        style={{ width: 72, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, color: "var(--text)", fontSize: "0.7rem", padding: "0.18rem 0.25rem", outline: "none", flexShrink: 0 }}>
                        <option value={7}>7 — week</option>
                        <option value={12}>12 — month</option>
                        <option value={24}>24 — hour</option>
                        <option value={31}>31 — day</option>
                        <option value={52}>52 — wk/yr</option>
                        <option value={365}>365 — year</option>
                      </select>
                    )}
                  </div>
                  {isOn && (
                    <div style={{ fontSize: "0.61rem", color: "var(--text3)", paddingLeft: "2.15rem", marginTop: "0.1rem" }}>
                      → {c.name}_sin, {c.name}_cos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Row Aggregates */}
      {numCols.length >= 2 && (
        <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SideLabel>Row Aggregates</SideLabel>
          <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.45rem", lineHeight: 1.6 }}>
            Summarises multiple columns into one new value per row. Useful when individual columns matter less than their combined pattern. Select 2+ columns and an aggregation; outputs a single <span style={{ color: `${ACCENT}cc` }}>row_{rowAggFn}</span> column.{rowAggCols.length >= 2 && <span style={{ color: ACCENT }}> → row_{rowAggFn}</span>}
            <br /><span style={{ color: `${ACCENT}99`, fontStyle: "italic" }}>Use on: row_mean of health vitals (glucose, BMI, bp) as an overall risk score; row_sum of expense categories as total spend; row_max of test scores as peak performance.</span>
          </div>
          <select value={rowAggFn} onChange={e => onSetRowAggFn(e.target.value)}
            style={{ ...SELECT_STYLE, width: "100%", marginBottom: "0.5rem" }}>
            <option value="mean">mean</option>
            <option value="max">max</option>
            <option value="min">min</option>
            <option value="std">std</option>
            <option value="sum">sum</option>
          </select>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
            {numCols.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <Toggle checked={rowAggCols.includes(c.name)} onChange={() => onToggleRowAggCol(c.name)} />
                <span style={{ fontSize: "0.78rem", color: rowAggCols.includes(c.name) ? "var(--text)" : "var(--text3)" }}>{c.name}</span>
              </div>
            ))}
          </div>
          {rowAggCols.length === 1 && <div style={{ fontSize: "0.62rem", color: "#f87171", marginTop: "0.4rem" }}>Select at least 2 columns</div>}
        </div>
      )}

      {/* Time-Series Features */}
      <div style={{ padding: "1rem 1.3rem" }}>
        <SideLabel>Time-Series Features</SideLabel>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.65rem", lineHeight: 1.5 }}>
          Sort rows by a column, then apply lag/diff or rolling aggregates.
        </div>

        {/* Sort column selector */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.28rem" }}>Sort column</div>
          <select value={sortCol} onChange={e => onSetSortCol(e.target.value)}
            style={{ ...SELECT_STYLE, width: "100%" }}>
            <option value="">— none —</option>
            {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {sortCol && (
          <>
            {/* Lag / Diff */}
            <div style={{ marginBottom: "0.6rem", padding: "0.65rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Lag / Diff</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0 }}>N =</span>
                <input
                  type="number" min={1} max={10} value={lagN}
                  onChange={e => onSetLagN(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 42, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.78rem", padding: "0.2rem 0.3rem", outline: "none", textAlign: "center" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "0.28rem", marginLeft: "auto" }}>
                  <span style={{ fontSize: "0.71rem", color: "var(--text3)" }}>+diff</span>
                  <Toggle checked={lagDiff} onChange={onToggleLagDiff} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {numCols.map(c => (
                  <button key={c.name}
                    onClick={() => onToggleLagCol(c.name)}
                    style={{ padding: "2px 7px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${lagCols.includes(c.name) ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                      background: lagCols.includes(c.name) ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                      color: lagCols.includes(c.name) ? "#f59e0b" : "var(--text3)",
                      transition: "all 0.13s" }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Rolling Window */}
            <div style={{ padding: "0.65rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#e879f9", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Rolling Window</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0 }}>N =</span>
                <input
                  type="number" min={2} max={20} value={rollN}
                  onChange={e => onSetRollN(Math.max(2, parseInt(e.target.value) || 2))}
                  style={{ width: 42, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.78rem", padding: "0.2rem 0.3rem", outline: "none", textAlign: "center" }}
                />
                <select value={rollAgg} onChange={e => onSetRollAgg(e.target.value)}
                  style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.74rem", padding: "0.22rem 0.3rem", outline: "none" }}>
                  <option value="mean">mean</option>
                  <option value="std">std</option>
                  <option value="min">min</option>
                  <option value="max">max</option>
                </select>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {numCols.map(c => (
                  <button key={c.name}
                    onClick={() => onToggleRollCol(c.name)}
                    style={{ padding: "2px 7px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${rollCols.includes(c.name) ? "#e879f9" : "rgba(255,255,255,0.1)"}`,
                      background: rollCols.includes(c.name) ? "rgba(232,121,249,0.1)" : "rgba(255,255,255,0.03)",
                      color: rollCols.includes(c.name) ? "#e879f9" : "var(--text3)",
                      transition: "all 0.13s" }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}