"use client";

import {
  AnalyzeResult, PresetKey,
  MV_NUM_OPTIONS, MV_CAT_OPTIONS, ENCODE_OPTIONS,
} from "@/lib/preprocessingAlgorithms";
import { SmartRecommendations } from "./SmartRecommendations";
import { PresetsBar }           from "./PresetsBar";
import { DatasetOverview }      from "./DatasetOverview";
import { Toggle }               from "./Toggle";
import DatasetEstimator         from "@/components/DatasetEstimator";

const ACCENT  = "#22d3ee";
const CARD_BG = "var(--bg-glass)";

const selectStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: 8,
  color: "var(--text)", fontSize: "0.8rem", padding: "0.4rem 0.6rem", width: "100%",
} as const;

export interface ConfigurePanelProps {
  analyzed: AnalyzeResult;
  target: string;
  setTarget: (v: string) => void;
  dropCols: Set<string>;
  setDropCols: (fn: (prev: Set<string>) => Set<string>) => void;
  mvNum: string;
  setMvNum: (v: string) => void;
  mvCat: string;
  setMvCat: (v: string) => void;
  removeDups: boolean;
  setRemoveDups: (v: boolean) => void;
  removeOutliers: boolean;
  setRemoveOutliers: (v: boolean) => void;
  fixSkewness: boolean;
  setFixSkewness: (v: boolean) => void;
  encodeMethod: string;
  setEncodeMethod: (v: string) => void;
  standardize: boolean;
  setStandardize: (v: boolean) => void;
  activePreset: PresetKey;
  setActivePreset: (v: PresetKey) => void;
  applyPreset: (key: PresetKey) => void;
  wrapSetter: <T>(setter: (v: T) => void) => (v: T) => void;
  error: string | null;
  onReset: () => void;
  onPreprocess: () => void;
  targetEncodingWarn: boolean;
}

export function ConfigurePanel({
  analyzed, target, setTarget, dropCols, setDropCols,
  mvNum, setMvNum, mvCat, setMvCat,
  removeDups, setRemoveDups, removeOutliers, setRemoveOutliers,
  fixSkewness, setFixSkewness, encodeMethod, setEncodeMethod,
  standardize, setStandardize,
  activePreset, setActivePreset, applyPreset, wrapSetter,
  error, onReset, onPreprocess, targetEncodingWarn,
}: ConfigurePanelProps) {
  const catCols = analyzed.columns.filter(c => !c.is_numeric);
  const hasCat  = catCols.length > 0;

  return (
    <div data-wt="prep-configure" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Stats + Presets bar */}
      <div data-wt="prep-stats" style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1rem", flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {[
            { label: "Rows",    value: analyzed.rows.toLocaleString() },
            { label: "Columns", value: analyzed.columns.length },
            { label: "Missing", value: analyzed.total_missing },
          ].map(s => (
            <div key={s.label} style={{ padding: "0.5rem 0.85rem", borderRadius: 10, background: CARD_BG, border: "1px solid var(--border)", textAlign: "center", minWidth: 70 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: ACCENT }}>{s.value}</div>
              <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <PresetsBar active={activePreset} onSelect={applyPreset} />
        </div>
      </div>

      {/* Two-column layout — each panel scrolls independently */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "stretch", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Left sidebar: Smart Recommendations */}
        <div style={{ width: 280, minWidth: 250, flexShrink: 0, overflowY: "auto", paddingRight: 6, paddingBottom: "2rem" }}>
          <SmartRecommendations
            analyzed={analyzed} target={target}
            dropCols={dropCols} mvNum={mvNum} fixSkewness={fixSkewness}
            standardize={standardize} encodeMethod={encodeMethod}
            setDropCols={setDropCols}
            setMvNum={wrapSetter(setMvNum)}
            setFixSkewness={wrapSetter(setFixSkewness)}
            setStandardize={wrapSetter(setStandardize)}
            setEncodeMethod={wrapSetter(setEncodeMethod)}
          />
          <DatasetEstimator n={analyzed.rows} p={analyzed.columns.length} tool="preprocessing" />
        </div>

        {/* Right: config controls — single scrollable column */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", paddingRight: 4, paddingBottom: "2rem" }}>
          <DatasetOverview analyzed={analyzed} />

          {/* Target column */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>Target Column (optional)</label>
            <select value={target} onChange={e => { setTarget(e.target.value); setActivePreset("custom"); }} style={selectStyle}>
              <option value="">— none —</option>
              {analyzed.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Column drop pills */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>Columns — click to drop</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: 130, overflowY: "auto" }}>
              {analyzed.columns.map(col => {
                const dropped = dropCols.has(col.name);
                const missingPct = analyzed.rows > 0 ? Math.round((col.missing / analyzed.rows) * 100) : 0;
                return (
                  <button key={col.name}
                    onClick={() => { setDropCols(prev => { const n = new Set(prev); dropped ? n.delete(col.name) : n.add(col.name); return n; }); setActivePreset("custom"); }}
                    style={{
                      padding: "3px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                      border: `1px solid ${dropped ? "#ef4444" : col.is_numeric ? `${ACCENT}44` : "rgba(192,132,252,0.35)"}`,
                      background: dropped ? "rgba(239,68,68,0.12)" : col.is_numeric ? `${ACCENT}10` : "rgba(192,132,252,0.08)",
                      color: dropped ? "#f87171" : col.is_numeric ? ACCENT : "#c084fc",
                      textDecoration: dropped ? "line-through" : "none",
                    }}
                  >
                    {col.name}{missingPct > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>{missingPct}%</span>}
                  </button>
                );
              })}
            </div>
            {dropCols.size > 0 && <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: "0.4rem" }}>{dropCols.size} column{dropCols.size > 1 ? "s" : ""} will be dropped</div>}
          </div>

          {/* Imputation */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>Numeric Imputation</label>
              <select value={mvNum} onChange={e => { setMvNum(e.target.value); setActivePreset("custom"); }} style={selectStyle}>
                {MV_NUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {hasCat && (
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>Categorical Imputation</label>
                <select value={mvCat} onChange={e => { setMvCat(e.target.value); setActivePreset("custom"); }} style={selectStyle}>
                  {MV_CAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Encoding */}
          {hasCat && (
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>Categorical Encoding</label>
              <select value={encodeMethod} onChange={e => { setEncodeMethod(e.target.value); setActivePreset("custom"); }} style={selectStyle}>
                {ENCODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {targetEncodingWarn && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#fb923c", padding: "0.4rem 0.75rem", borderRadius: 8, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}>
                  Target encoding requires a target column — select one above.
                </div>
              )}
            </div>
          )}

          {/* Toggles */}
          <div style={{ padding: "1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
              <Toggle on={removeDups}     onChange={v => { setRemoveDups(v);     setActivePreset("custom"); }} label="Remove Duplicates" />
              <Toggle on={removeOutliers} onChange={v => { setRemoveOutliers(v); setActivePreset("custom"); }} label="Remove Outliers (IQR)" />
              <Toggle on={fixSkewness}    onChange={v => { setFixSkewness(v);    setActivePreset("custom"); }} label="Fix Skewness (log1p)" />
              <Toggle on={standardize}    onChange={v => { setStandardize(v);    setActivePreset("custom"); }} label="Standardize (Z-score)" />
            </div>
          </div>

          {error && <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.82rem" }}>{error}</div>}

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={onReset}
              style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, fontSize: "0.82rem", background: "var(--border)", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; }}
            >Back</button>
            <button onClick={onPreprocess} disabled={targetEncodingWarn} data-wt="prep-run"
              style={{ flex: 1, padding: "0.6rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700, background: ACCENT, color: "#fff", border: "none", cursor: targetEncodingWarn ? "not-allowed" : "pointer", opacity: targetEncodingWarn ? 0.5 : 1, transition: "box-shadow 0.15s, transform 0.15s" }}
              onMouseEnter={e => { if (!targetEncodingWarn) { e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}66`; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Preprocess Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}