"use client";

import DatasetOverview from "./DatasetOverview";
import Toggle from "./Toggle";
import {
  ACCENT, CARD_BG, SELECT_STYLE,
  MV_NUM_OPTIONS, MV_CAT_OPTIONS, ENCODE_OPTIONS,
  type AnalyzeResult,
} from "@/lib/preprocessingModalUtils";

interface ConfigureStepProps {
  analyzed: AnalyzeResult;
  target: string;
  setTarget: (v: string) => void;
  dropCols: Set<string>;
  setDropCols: (fn: (prev: Set<string>) => Set<string>) => void;
  mvNum: string;
  setMvNum: (v: string) => void;
  mvCat: string;
  setMvCat: (v: string) => void;
  encodeMethod: string;
  setEncodeMethod: (v: string) => void;
  removeDups: boolean;
  setRemoveDups: (v: boolean) => void;
  removeOutliers: boolean;
  setRemoveOutliers: (v: boolean) => void;
  fixSkewness: boolean;
  setFixSkewness: (v: boolean) => void;
  standardize: boolean;
  setStandardize: (v: boolean) => void;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

export default function ConfigureStep({
  analyzed, target, setTarget, dropCols, setDropCols,
  mvNum, setMvNum, mvCat, setMvCat, encodeMethod, setEncodeMethod,
  removeDups, setRemoveDups, removeOutliers, setRemoveOutliers,
  fixSkewness, setFixSkewness, standardize, setStandardize,
  error, onBack, onSubmit,
}: ConfigureStepProps) {
  const catCols = analyzed.columns.filter(c => !c.is_numeric);
  const hasCat  = catCols.length > 0;
  const targetEncodingWarn = encodeMethod === "target" && !target;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {[
          { label: "Rows",    value: analyzed.rows.toLocaleString() },
          { label: "Columns", value: analyzed.columns.length },
          { label: "Missing", value: analyzed.total_missing },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: "0.65rem", borderRadius: 10,
            background: CARD_BG, border: "1px solid var(--border)", textAlign: "center",
          }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: ACCENT }}>{s.value}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <DatasetOverview analyzed={analyzed} />

      {/* Target column */}
      <div>
        <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
          Target Column (optional)
        </label>
        <select value={target} onChange={e => setTarget(e.target.value)} style={SELECT_STYLE}>
          <option value="">— none —</option>
          {analyzed.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Column drop pills */}
      <div>
        <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>
          Columns — click to drop
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: 130, overflowY: "auto" }}>
          {analyzed.columns.map(col => {
            const dropped = dropCols.has(col.name);
            const missingPct = analyzed.rows > 0 ? Math.round((col.missing / analyzed.rows) * 100) : 0;
            return (
              <button key={col.name}
                onClick={() => setDropCols(prev => { const n = new Set(prev); dropped ? n.delete(col.name) : n.add(col.name); return n; })}
                style={{
                  padding: "3px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 500,
                  border: `1px solid ${dropped ? "#ef4444" : col.is_numeric ? `${ACCENT}44` : "var(--border2)"}`,
                  background: dropped ? "rgba(239,68,68,0.12)" : col.is_numeric ? `${ACCENT}10` : "var(--border)",
                  color: dropped ? "#f87171" : col.is_numeric ? ACCENT : "var(--text2)",
                  cursor: "pointer", transition: "all 0.15s",
                  textDecoration: dropped ? "line-through" : "none",
                }}
              >
                {col.name}
                {missingPct > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>{missingPct}%</span>}
              </button>
            );
          })}
        </div>
        {dropCols.size > 0 && (
          <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: "0.4rem" }}>
            {dropCols.size} column{dropCols.size > 1 ? "s" : ""} will be dropped
          </div>
        )}
      </div>

      {/* Imputation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
            Numeric Imputation
          </label>
          <select value={mvNum} onChange={e => setMvNum(e.target.value)} style={SELECT_STYLE}>
            {MV_NUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {hasCat && (
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
              Categorical Imputation
            </label>
            <select value={mvCat} onChange={e => setMvCat(e.target.value)} style={SELECT_STYLE}>
              {MV_CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Encoding */}
      {hasCat && (
        <div>
          <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
            Categorical Encoding
          </label>
          <select value={encodeMethod} onChange={e => setEncodeMethod(e.target.value)} style={SELECT_STYLE}>
            {ENCODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {targetEncodingWarn && (
            <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#fb923c",
              padding: "0.4rem 0.75rem", borderRadius: 8,
              background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}>
              Target encoding requires a target column — select one above.
            </div>
          )}
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem",
        padding: "1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
        <Toggle on={removeDups}     onChange={setRemoveDups}     label="Remove Duplicates" />
        <Toggle on={removeOutliers} onChange={setRemoveOutliers} label="Remove Outliers (IQR)" />
        <Toggle on={fixSkewness}    onChange={setFixSkewness}    label="Fix Skewness (log1p)" />
        <Toggle on={standardize}    onChange={setStandardize}    label="Standardize (Z-score)" />
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: 10,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button onClick={onBack} style={{
          padding: "0.6rem 1.2rem", borderRadius: 9999, fontSize: "0.82rem",
          background: "var(--border)", border: "1px solid var(--border2)",
          color: "var(--text2)", cursor: "pointer",
        }}>
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={targetEncodingWarn}
          style={{
            flex: 1, padding: "0.6rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem",
            fontWeight: 700, background: ACCENT, color: "#0b1120", border: "none",
            cursor: targetEncodingWarn ? "not-allowed" : "pointer",
            opacity: targetEncodingWarn ? 0.5 : 1,
          }}
        >
          Preprocess Dataset
        </button>
      </div>
    </div>
  );
}