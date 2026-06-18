"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ML_UNIFIED_API as API } from "@/config/urls";

const ACCENT    = "#22d3ee";
const CARD_BG   = "rgba(17,24,39,0.80)";
const PAGE_BG   = "#060d1a";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColumnInfo = {
  name: string; is_numeric: boolean; nunique: number; missing: number; dtype: string;
  skew?: number; mean?: number; std?: number; min?: number; max?: number;
};

type AnalyzeResult = {
  columns: ColumnInfo[];
  suggested_target: string;
  rows: number;
  total_missing: number;
};

type PrepResult = {
  csv_b64: string;
  preprocessed_filename: string;
  rows_before: number; rows_after: number;
  cols_before: number; cols_after: number;
  features_before: number; features_after: number;
  ohe_cols_added: number; total_missing: number;
  columns: ColumnInfo[];
};

type Step = "upload" | "configure" | "processing" | "results";
type PresetKey = "quick-clean" | "ml-ready" | "custom";

// ── Option lists ──────────────────────────────────────────────────────────────

const MV_NUM_OPTIONS = [
  { value: "mean",     label: "Mean" },
  { value: "median",   label: "Median" },
  { value: "knn",      label: "KNN (k=5)" },
  { value: "mice",     label: "MICE (iterative)" },
  { value: "ffill",    label: "Forward Fill" },
  { value: "bfill",    label: "Backward Fill" },
  { value: "constant", label: "Constant (0)" },
  { value: "drop",     label: "Drop rows" },
];

const MV_CAT_OPTIONS = [
  { value: "most_frequent", label: "Most Frequent" },
  { value: "ffill",         label: "Forward Fill" },
  { value: "bfill",         label: "Backward Fill" },
  { value: "constant",      label: "Constant (\"Unknown\")" },
  { value: "drop",          label: "Drop rows" },
];

const ENCODE_OPTIONS = [
  { value: "none",      label: "None (keep as-is)" },
  { value: "onehot",    label: "One-Hot Encoding" },
  { value: "ordinal",   label: "Ordinal (Label) Encoding" },
  { value: "frequency", label: "Frequency Encoding" },
  { value: "target",    label: "Target Encoding (requires target column)" },
];

const PRESETS: Record<PresetKey, {
  label: string; desc: string;
  config: { mvNum: string; mvCat: string; removeOutliers: boolean; fixSkewness: boolean; encodeMethod: string; standardize: boolean; removeDups: boolean };
}> = {
  "quick-clean": {
    label: "Quick Clean",
    desc: "Dedup + mean impute, no encoding changes",
    config: { removeDups: true, mvNum: "mean", mvCat: "most_frequent", removeOutliers: false, fixSkewness: false, encodeMethod: "none", standardize: false },
  },
  "ml-ready": {
    label: "ML Ready",
    desc: "KNN impute, outlier removal, skew fix, OHE, Z-score",
    config: { removeDups: true, mvNum: "knn", mvCat: "most_frequent", removeOutliers: true, fixSkewness: true, encodeMethod: "onehot", standardize: true },
  },
  "custom": {
    label: "Custom",
    desc: "Start with defaults and configure manually",
    config: { removeDups: true, mvNum: "mean", mvCat: "most_frequent", removeOutliers: false, fixSkewness: false, encodeMethod: "none", standardize: false },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(v: number) {
  if (Math.abs(v) >= 10000) return v.toFixed(0);
  if (Math.abs(v) >= 100)   return v.toFixed(1);
  if (Math.abs(v) >= 10)    return v.toFixed(1);
  return v.toFixed(2);
}

function missingColor(pct: number) {
  return pct > 30 ? "#f87171" : pct > 10 ? "#fb923c" : "#4ade80";
}

function skewBadge(s: number) {
  const abs = Math.abs(s);
  if (abs >= 1)   return { label: "High skew",  color: "#f87171", desc: "Long tail — log transform recommended" };
  if (abs >= 0.5) return { label: "Moderate",   color: "#fb923c", desc: "Slight asymmetry" };
  return               { label: "Normal",      color: "#4ade80", desc: "Roughly symmetric" };
}

function scoreColor(s: number) {
  return s >= 85 ? "#4ade80" : s >= 70 ? "#fbbf24" : s >= 50 ? "#fb923c" : "#f87171";
}

function computeQualityScore(rows: number, totalMissing: number, columns: ColumnInfo[]): number {
  let score = 100;
  const totalCells = rows * columns.length;
  if (totalCells > 0) {
    const pct = (totalMissing / totalCells) * 100;
    score -= Math.min(45, pct * 2.5);
  }
  const numericCols = columns.filter(c => c.is_numeric);
  const highSkewCount = numericCols.filter(c => Math.abs(c.skew ?? 0) >= 1).length;
  if (numericCols.length > 0) {
    score -= Math.min(35, (highSkewCount / numericCols.length) * 70);
  }
  const missingCols = columns.filter(c => c.missing > 0).length;
  score -= Math.min(20, (missingCols / Math.max(1, columns.length)) * 40);
  return Math.max(0, Math.round(score));
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
      <div onClick={() => onChange(!on)} style={{
        width: 36, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0,
        background: on ? ACCENT : "var(--border2)", transition: "background 0.2s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
          borderRadius: 9999, background: "#fff", transition: "left 0.2s",
        }} />
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{label}</span>
    </label>
  );
}

// ── Mini bell curve SVG ───────────────────────────────────────────────────────

function MiniDistChart({ col, width = 160, dimmed = false }: { col: ColumnInfo; width?: number; dimmed?: boolean }) {
  const { min = 0, max = 0, mean = 0, std = 1, skew = 0 } = col;
  const W = width, H = 48;

  if (min === max) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ opacity: dimmed ? 0.45 : 1 }}>
        <line x1={W / 2} y1={H} x2={W / 2} y2={4} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
        <circle cx={W / 2} cy={4} r={2.5} fill={ACCENT} />
      </svg>
    );
  }

  const N = 80;
  const range = max - min;
  const skewFactor = Math.max(-0.7, Math.min(0.7, (skew ?? 0) * 0.28));
  const yVals: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = min + (i / N) * range;
    const isRight = x >= mean;
    const effStd = Math.max(range * 0.001, isRight
      ? (std || range * 0.2) * (1 + skewFactor)
      : (std || range * 0.2) * (1 - skewFactor));
    yVals.push(Math.exp(-0.5 * ((x - mean) / effStd) ** 2));
  }

  const maxY = Math.max(...yVals, 0.01);
  const pts = yVals.map((y, i) => ({ sx: (i / N) * W, sy: H - 2 - ((y / maxY) * (H - 8)) }));
  const fillPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ") + ` L${W},${H} L0,${H} Z`;
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
  const meanX = ((mean - min) / range) * W;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", opacity: dimmed ? 0.45 : 1 }}>
      <path d={fillPath} fill={ACCENT} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1={meanX} y1={H} x2={meanX} y2={4} stroke={ACCENT} strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.7" />
    </svg>
  );
}

// ── Smart Recommendations ─────────────────────────────────────────────────────

type RecAction = { label: string; onApply: () => void; active: boolean };

type Rec = {
  id: string;
  type: "drop" | "skew" | "missing" | "encoding" | "standardize" | "info";
  title: string;
  desc: string;
  col?: string;
  actionLabel?: string;
  applied?: boolean;
  onApply?: () => void;
  actions?: RecAction[];
};

function RecTypeIcon({ type }: { type: Rec["type"] }) {
  const colors: Record<Rec["type"], string> = {
    drop: "#f87171", skew: ACCENT, missing: "#fbbf24",
    encoding: "#a78bfa", standardize: "#4ade80", info: "var(--text3)",
  };
  const c = colors[type];
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 3,
      background: c, boxShadow: `0 0 5px ${c}88`,
    }} />
  );
}

function SmartRecommendations({
  analyzed, target, dropCols, mvNum, fixSkewness, standardize, encodeMethod,
  setDropCols, setMvNum, setFixSkewness, setStandardize, setEncodeMethod,
}: {
  analyzed: AnalyzeResult; target: string;
  dropCols: Set<string>; mvNum: string; fixSkewness: boolean; standardize: boolean; encodeMethod: string;
  setDropCols: (fn: (prev: Set<string>) => Set<string>) => void;
  setMvNum: (v: string) => void;
  setFixSkewness: (v: boolean) => void;
  setStandardize: (v: boolean) => void;
  setEncodeMethod: (v: string) => void;
}) {
  const recs: Rec[] = useMemo(() => {
    const list: Rec[] = [];
    const numCols = analyzed.columns.filter(c => c.is_numeric);
    const catCols = analyzed.columns.filter(c => !c.is_numeric);

    // ID-like columns
    analyzed.columns
      .filter(c => c.nunique >= analyzed.rows * 0.97 && c.name !== target)
      .forEach(col => {
        list.push({
          id: `drop-${col.name}`, type: "drop",
          title: `Drop ${col.name}`,
          desc: `Every row has a unique value — likely an ID with no predictive signal.`,
          col: col.name,
          applied: dropCols.has(col.name),
          actionLabel: "Drop it",
          onApply: () => setDropCols(prev => { const n = new Set(prev); n.add(col.name); return n; }),
        });
      });

    // High-skew columns
    const highSkewCols = numCols.filter(c => Math.abs(c.skew ?? 0) >= 1 && !dropCols.has(c.name));
    if (highSkewCols.length > 0) {
      list.push({
        id: "fix-skew", type: "skew",
        title: `Fix skewness (${highSkewCols.length} col${highSkewCols.length > 1 ? "s" : ""})`,
        desc: `${highSkewCols.map(c => `${c.name} (${(c.skew ?? 0).toFixed(1)})`).join(", ")} — log1p makes distributions more symmetric, improving linear models significantly.`,
        applied: fixSkewness,
        actionLabel: "Enable",
        onApply: () => setFixSkewness(true),
      });
    }

    // Heavy missing (>15%)
    const heavyMissing = numCols.filter(c => c.missing > 0 && (c.missing / analyzed.rows) > 0.15 && !dropCols.has(c.name));
    if (heavyMissing.length > 0) {
      list.push({
        id: "knn-impute", type: "missing",
        title: "Use KNN imputation",
        desc: `${heavyMissing.map(c => `${c.name} (${Math.round((c.missing / analyzed.rows) * 100)}%)`).join(", ")} — KNN captures local patterns for heavy missingness better than mean.`,
        applied: mvNum === "knn",
        actionLabel: "Use KNN",
        onApply: () => setMvNum("knn"),
      });
    }

    // High-cardinality categoricals
    catCols.filter(c => c.nunique > 30 && !dropCols.has(c.name)).forEach(col => {
      list.push({
        id: `highcard-${col.name}`, type: "encoding",
        title: `High cardinality: ${col.name}`,
        desc: `${col.nunique} unique values — one-hot would add ${col.nunique} columns. Frequency or Target encoding are safer options.`,
        applied: encodeMethod === "frequency" || encodeMethod === "target",
        actions: [
          { label: "Use Frequency", onApply: () => setEncodeMethod("frequency"), active: encodeMethod === "frequency" },
          { label: "Use Target Encoding", onApply: () => setEncodeMethod("target"), active: encodeMethod === "target" },
        ],
      });
    });

    // Standardize suggestion
    if (numCols.length > 0) {
      list.push({
        id: "standardize", type: "standardize",
        title: "Enable standardization",
        desc: "Z-score scaling improves distance-based models (KNN, SVM) and linear models. Tree models are unaffected.",
        applied: standardize,
        actionLabel: "Enable",
        onApply: () => setStandardize(true),
      });
    }

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzed, target, dropCols, mvNum, fixSkewness, standardize, encodeMethod]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <div style={{
        fontSize: "0.72rem", fontWeight: 700, color: ACCENT,
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: "0.6rem",
        display: "flex", alignItems: "center", gap: "0.5rem",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="7" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.6" fill={ACCENT} />
        </svg>
        Smart Recommendations
      </div>

      {recs.length === 0 ? (
        <div style={{ padding: "1rem", borderRadius: 10, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", fontSize: "0.75rem", color: "#4ade80" }}>
          Dataset looks clean — no critical issues detected.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recs.map(rec => (
            <div key={rec.id} style={{
              padding: "0.65rem 0.8rem", borderRadius: 10,
              background: rec.applied ? "rgba(74,222,128,0.05)" : CARD_BG,
              border: `1px solid ${rec.applied ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
              transition: "border-color 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <RecTypeIcon type={rec.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {rec.title}
                    {rec.applied && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                        <polyline points="1.5,6 4.5,9 10.5,2.5" />
                      </svg>
                    )}
                  </div>
                  <p style={{ fontSize: "0.67rem", color: "var(--text3)", margin: 0, lineHeight: 1.55 }}>{rec.desc}</p>
                  {rec.actions ? (
                    <div style={{ marginTop: "0.45rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {rec.actions.map(a => (
                        <button
                          key={a.label}
                          onClick={a.onApply}
                          style={{
                            padding: "2px 10px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
                            background: a.active ? `${ACCENT}28` : `${ACCENT}14`,
                            border: `1px solid ${a.active ? ACCENT + "80" : ACCENT + "40"}`,
                            color: ACCENT, display: "flex", alignItems: "center", gap: "0.3rem",
                            transition: "box-shadow 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 10px ${ACCENT}44`; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                        >
                          {a.active && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : !rec.applied && rec.onApply ? (
                    <button
                      onClick={rec.onApply}
                      style={{
                        marginTop: "0.45rem", padding: "2px 10px", borderRadius: 9999,
                        fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
                        background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`, color: ACCENT,
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 10px ${ACCENT}44`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {rec.actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Presets bar ───────────────────────────────────────────────────────────────

function PresetsBar({
  active, onSelect,
}: {
  active: PresetKey;
  onSelect: (key: PresetKey) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem", borderRadius: 12,
      background: CARD_BG, border: "1px solid var(--border)",
      marginBottom: "1.25rem",
    }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
        Presets
      </span>
      <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
        {(Object.keys(PRESETS) as PresetKey[]).map(key => {
          const p = PRESETS[key];
          const isActive = active === key;
          return (
            <button key={key} onClick={() => onSelect(key)}
              style={{
                padding: "0.35rem 1rem", borderRadius: 9999, cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 600,
                background: isActive ? `${ACCENT}22` : "transparent",
                border: `1px solid ${isActive ? ACCENT + "66" : "var(--border2)"}`,
                color: isActive ? ACCENT : "var(--text2)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 14px ${ACCENT}33`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: "0.67rem", color: "var(--text3)", maxWidth: 180 }}>
        {PRESETS[active].desc}
      </span>
    </div>
  );
}

// ── Quality Score Card ────────────────────────────────────────────────────────

function QualityScoreCard({ before, after }: { before: number; after: number }) {
  const diff = after - before;
  return (
    <div style={{
      padding: "1.25rem 1.5rem", borderRadius: 14,
      background: CARD_BG, border: "1px solid var(--border)",
      marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Data Quality Score
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.2rem", lineHeight: 1.5 }}>
            Based on: missing value rate (45 pts), column skewness (35 pts), coverage (20 pts)
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Before</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: scoreColor(before), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{before}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.5, flexShrink: 0 }}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: "0.25rem" }}>After</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: scoreColor(after), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{after}</div>
          </div>
          {diff > 0 && (
            <div style={{
              padding: "0.3rem 0.8rem", borderRadius: 9999,
              background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
              color: "#4ade80", fontSize: "0.85rem", fontWeight: 700,
            }}>
              +{diff} pts
            </div>
          )}
        </div>
      </div>

      {/* Score bars */}
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 44, flexShrink: 0 }}>Before</span>
          <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${before}%`, background: scoreColor(before), borderRadius: 9999, transition: "width 0.6s ease" }} />
          </div>
          <span style={{ fontSize: "0.65rem", color: scoreColor(before), width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{before}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 44, flexShrink: 0 }}>After</span>
          <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${after}%`, background: scoreColor(after), borderRadius: 9999, transition: "width 0.6s ease" }} />
          </div>
          <span style={{ fontSize: "0.65rem", color: scoreColor(after), width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{after}</span>
        </div>
      </div>
    </div>
  );
}

// ── Dataset Overview ──────────────────────────────────────────────────────────

function DatasetOverview({ analyzed }: { analyzed: AnalyzeResult }) {
  const [open, setOpen] = useState(true);
  const numCols = analyzed.columns.filter(c => c.is_numeric);
  const catCols = analyzed.columns.filter(c => !c.is_numeric);
  const colsWithMissing = analyzed.columns.filter(c => c.missing > 0).sort((a, b) => b.missing - a.missing);

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
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

      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1.1rem", background: "rgba(11,17,32,0.6)" }}>
          {colsWithMissing.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.55rem" }}>Missing Values</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {colsWithMissing.slice(0, 10).map(col => {
                  const pct = Math.round((col.missing / analyzed.rows) * 100);
                  const clr = missingColor(pct);
                  return (
                    <div key={col.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text2)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
                      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, minWidth: 4, background: clr, borderRadius: 9999, transition: "width 0.4s ease" }} />
                      </div>
                      <span style={{ fontSize: "0.68rem", color: clr, width: 60, flexShrink: 0, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{col.missing} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

// ── Comparison View ───────────────────────────────────────────────────────────

function ComparisonView({ before, result }: { before: AnalyzeResult; result: PrepResult }) {
  const [open, setOpen]           = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  const beforeMap = new Map(before.columns.map(c => [c.name, c]));
  const afterMap  = new Map(result.columns.map(c => [c.name, c]));
  const comparable = before.columns.filter(c => c.is_numeric && afterMap.has(c.name));
  const removed    = before.columns.filter(c => !afterMap.has(c.name));
  const added      = result.columns.filter(c => !beforeMap.has(c.name));

  function changeTags(b: ColumnInfo, a: ColumnInfo) {
    const tags: { label: string; color: string }[] = [];
    if (b.missing > 0 && a.missing === 0) tags.push({ label: "Missing filled", color: "#4ade80" });
    if (Math.abs(a.skew ?? 0) < Math.abs(b.skew ?? 0) - 0.3) tags.push({ label: "Skew reduced", color: ACCENT });
    if (Math.abs(a.mean ?? 0) < 0.05 && Math.abs((a.std ?? 1) - 1) < 0.1 &&
        (Math.abs(b.mean ?? 0) > 1 || Math.abs((b.std ?? 1) - 1) > 0.1))
      tags.push({ label: "Standardized", color: "#a78bfa" });
    if (tags.length === 0) tags.push({ label: "Unchanged", color: "var(--text3)" });
    return tags;
  }

  function computeDiffs(b: ColumnInfo, a: ColumnInfo) {
    const diffs: { text: string; color: string }[] = [];
    if (b.missing > 0 && a.missing === 0) diffs.push({ text: `${b.missing} missing → 0 (fully imputed)`, color: "#4ade80" });
    else if (b.missing > 0 && a.missing < b.missing) diffs.push({ text: `Missing: ${b.missing} → ${a.missing}`, color: "#fb923c" });
    const bMean = b.mean ?? 0, aMean = a.mean ?? 0;
    const meanPct = bMean !== 0 ? ((aMean - bMean) / Math.abs(bMean)) * 100 : 0;
    if (Math.abs(meanPct) > 5) diffs.push({ text: `Mean: ${fmtNum(bMean)} → ${fmtNum(aMean)} (${meanPct > 0 ? "+" : ""}${meanPct.toFixed(1)}%)`, color: ACCENT });
    const bStd = b.std ?? 1, aStd = a.std ?? 1;
    const stdPct = bStd !== 0 ? ((aStd - bStd) / bStd) * 100 : 0;
    if (Math.abs(stdPct) > 10) diffs.push({ text: `Std: ${fmtNum(bStd)} → ${fmtNum(aStd)} (${stdPct > 0 ? "+" : ""}${stdPct.toFixed(0)}%)`, color: "var(--text3)" });
    const bSkewAbs = Math.abs(b.skew ?? 0), aSkewAbs = Math.abs(a.skew ?? 0);
    if (bSkewAbs > 0.5 && aSkewAbs < bSkewAbs - 0.3) {
      const pct = Math.round((1 - aSkewAbs / bSkewAbs) * 100);
      diffs.push({ text: `Skew: ${(b.skew ?? 0).toFixed(2)} → ${(a.skew ?? 0).toFixed(2)} (${pct}% more symmetric)`, color: ACCENT });
    }
    return diffs;
  }

  const GUIDE_TAGS = [
    { color: "#4ade80",      label: "Missing filled", desc: "Null values were imputed using your chosen strategy." },
    { color: ACCENT,         label: "Skew reduced",   desc: "Distribution became more symmetric — |skew| dropped by >0.3." },
    { color: "#a78bfa",      label: "Standardized",   desc: "Mean ≈ 0 and std ≈ 1. Helps scale-sensitive models." },
    { color: "var(--text3)", label: "Unchanged",      desc: "No statistically significant change detected." },
  ];

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", marginBottom: "1.25rem" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.65rem 1rem", background: CARD_BG, border: "none", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>Before vs After</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)" }}>{comparable.length} numeric column{comparable.length !== 1 ? "s" : ""} compared</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(11,17,32,0.6)" }}>
          {/* Guide */}
          <div style={{ borderRadius: 8, border: "1px solid rgba(129,140,248,0.22)", overflow: "hidden" }}>
            <button onClick={() => setGuideOpen(g => !g)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 0.8rem", background: "rgba(129,140,248,0.07)", border: "none", cursor: "pointer",
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="7" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.6" fill="#818cf8" />
              </svg>
              <span style={{ flex: 1, fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, textAlign: "left" }}>How to read this chart</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"
                style={{ transform: guideOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
            {guideOpen && (
              <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: "0.85rem", background: "rgba(11,17,32,0.5)" }}>
                <p style={{ margin: 0 }}>Each card shows one numeric column <strong style={{ color: "var(--text)" }}>before</strong> and <strong style={{ color: "var(--text)" }}>after</strong> preprocessing. The bell curve represents the distribution shape.</p>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Change tags</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {GUIDE_TAGS.map(t => (
                      <div key={t.label} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                        <span style={{ marginTop: 2, padding: "1px 8px", borderRadius: 9999, fontSize: "0.6rem", fontWeight: 600, flexShrink: 0, background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33` }}>{t.label}</span>
                        <span style={{ color: "var(--text3)" }}>{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column cards — show up to 10 on full page */}
          {comparable.slice(0, 10).map(beforeCol => {
            const afterCol  = afterMap.get(beforeCol.name)!;
            const tags       = changeTags(beforeCol, afterCol);
            const diffs      = computeDiffs(beforeCol, afterCol);
            const unchanged  = tags.length === 1 && tags[0].label === "Unchanged";
            return (
              <div key={beforeCol.name} style={{
                borderRadius: 10, overflow: "hidden",
                border: `1px solid ${unchanged ? "var(--border)" : `${ACCENT}28`}`,
                background: unchanged ? "rgba(11,17,32,0.35)" : `${ACCENT}05`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.85rem", borderBottom: "1px solid var(--border)", background: "rgba(11,17,32,0.45)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>{beforeCol.name}</span>
                    <span style={{ fontSize: "0.58rem", padding: "1px 6px", borderRadius: 9999, background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}25` }}>numeric</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {tags.map(t => (
                      <span key={t.label} style={{ fontSize: "0.6rem", padding: "1px 7px", borderRadius: 9999, fontWeight: 600, background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33` }}>{t.label}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "0.75rem 0.85rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div style={{ flex: 1, opacity: 0.48 }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Before</div>
                    <MiniDistChart col={beforeCol} width={240} dimmed />
                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.18rem", fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>
                      <div><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: "var(--text2)" }}>{fmtNum(beforeCol.mean ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>std </span><span style={{ color: "var(--text2)" }}>{fmtNum(beforeCol.std ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>skew </span><span style={{ color: "var(--text2)" }}>{(beforeCol.skew ?? 0).toFixed(2)}</span></div>
                      {beforeCol.missing > 0 && <div style={{ color: "#f87171" }}>{beforeCol.missing} missing</div>}
                    </div>
                  </div>
                  <div style={{ paddingTop: 32, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                      <path d="M3 9h12M11 5l4 4-4 4" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.6rem", color: ACCENT, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem", fontWeight: 700 }}>After</div>
                    <MiniDistChart col={afterCol} width={240} />
                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.18rem", fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>
                      <div><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: ACCENT, fontWeight: 600 }}>{fmtNum(afterCol.mean ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>std </span><span style={{ color: "var(--text2)" }}>{fmtNum(afterCol.std ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>skew </span><span style={{ color: "var(--text2)" }}>{(afterCol.skew ?? 0).toFixed(2)}</span></div>
                      {afterCol.missing === 0 && beforeCol.missing > 0 && <div style={{ color: "#4ade80" }}>0 missing</div>}
                    </div>
                  </div>
                </div>
                {diffs.length > 0 && (
                  <div style={{ padding: "0.45rem 0.85rem", borderTop: "1px solid var(--border)", background: "rgba(11,17,32,0.35)", display: "flex", flexDirection: "column", gap: "0.18rem" }}>
                    {diffs.map((d, i) => (
                      <div key={i} style={{ fontSize: "0.67rem", color: d.color, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 4, height: 4, borderRadius: 9999, background: d.color, flexShrink: 0, display: "inline-block" }} />
                        {d.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {comparable.length > 10 && <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center" }}>+{comparable.length - 10} more numeric columns</div>}

          {(removed.length > 0 || added.length > 0) && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Schema Changes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {removed.map(c => (
                  <span key={c.name} style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", textDecoration: "line-through" }}>{c.name}</span>
                ))}
                {added.length > 0 && (
                  <span style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem", background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>+{added.length} new column{added.length > 1 ? "s" : ""} from encoding</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Particle background ───────────────────────────────────────────────────────

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const N = 75;
    const MAX_DIST = 130;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.2 + 0.4,
    }));
    const resize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,211,238,0.55)"; ctx.fill();
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(34,211,238,${0.13 * (1 - d / MAX_DIST)})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }} />;
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_KEYS   = ["upload", "configure", "processing", "results"] as Step[];
const STEP_LABELS = ["Upload", "Configure", "Processing", "Results"];

function StepIndicator({ step }: { step: Step }) {
  const currentIdx = STEP_KEYS.indexOf(step);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {STEP_KEYS.map((s, i) => {
        const done   = i < currentIdx;
        const active = s === step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 9999,
              background: active ? ACCENT : done ? `${ACCENT}33` : "rgba(255,255,255,0.08)",
              border: `1px solid ${active || done ? ACCENT + "66" : "rgba(255,255,255,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              color: active ? "#000" : done ? ACCENT : "rgba(255,255,255,0.3)",
              transition: "all 0.2s",
            }}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              ) : i + 1}
            </div>
            <span style={{ fontSize: "0.72rem", color: active ? "var(--text)" : "rgba(255,255,255,0.35)", fontWeight: active ? 600 : 400 }}>{STEP_LABELS[i]}</span>
            {i < 3 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.1)" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PreprocessingPage() {
  const router = useRouter();

  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<PrepResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [target, setTarget]                 = useState("");
  const [dropCols, setDropCols]             = useState<Set<string>>(new Set());
  const [mvNum, setMvNum]                   = useState("mean");
  const [mvCat, setMvCat]                   = useState("most_frequent");
  const [removeDups, setRemoveDups]         = useState(true);
  const [removeOutliers, setRemoveOutliers] = useState(false);
  const [fixSkewness, setFixSkewness]       = useState(false);
  const [encodeMethod, setEncodeMethod]     = useState("none");
  const [standardize, setStandardize]       = useState(false);
  const [activePreset, setActivePreset]     = useState<PresetKey>("custom");

  const applyPreset = useCallback((key: PresetKey) => {
    const cfg = PRESETS[key].config;
    setMvNum(cfg.mvNum); setMvCat(cfg.mvCat);
    setRemoveDups(cfg.removeDups); setRemoveOutliers(cfg.removeOutliers);
    setFixSkewness(cfg.fixSkewness); setEncodeMethod(cfg.encodeMethod);
    setStandardize(cfg.standardize);
    setActivePreset(key);
  }, []);

  // Mark as Custom whenever user manually changes any option
  const wrapSetter = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
    setter(v); setActivePreset("custom");
  }, []);

  const analyze = useCallback(async (f: File) => {
    setAnalyzing(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data); setTarget(data.suggested_target); setStep("configure");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally { setAnalyzing(false); }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setFile(f); analyze(f);
  }, [analyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const handlePreprocess = useCallback(async () => {
    if (!file || !analyzed) return;
    setStep("processing"); setError(null);
    try {
      const csv_b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API}/automl/preprocess`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name, csv_b64, target_column: target,
          options: { remove_duplicates: removeDups, mv_num: mvNum, mv_cat: mvCat, remove_outliers: removeOutliers, fix_skewness: fixSkewness, encode_method: encodeMethod, standardize, drop_columns: [...dropCols] },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: PrepResult = await res.json();
      setResult(data); setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preprocessing failed");
      setStep("configure");
    }
  }, [file, analyzed, target, dropCols, mvNum, mvCat, removeDups, removeOutliers, fixSkewness, encodeMethod, standardize]);

  const downloadCSV = useCallback(() => {
    if (!result) return;
    const bytes = atob(result.csv_b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.preprocessed_filename; a.click(); URL.revokeObjectURL(url);
  }, [result]);

  const passToAutoML = useCallback(() => {
    if (!result) return;
    try { sessionStorage.setItem("prep_handoff", JSON.stringify({ csv_b64: result.csv_b64, filename: result.preprocessed_filename })); } catch {}
    router.push("/tools/automl");
  }, [result, router]);

  const goBackToConfigure = useCallback(() => setStep("configure"), []);

  const reset = useCallback(() => {
    setStep("upload"); setFile(null); setAnalyzed(null); setResult(null); setError(null);
    setDropCols(new Set()); setTarget(""); setMvNum("mean"); setMvCat("most_frequent");
    setRemoveDups(true); setRemoveOutliers(false); setFixSkewness(false);
    setEncodeMethod("none"); setStandardize(false); setActivePreset("custom");
  }, []);

  const selectStyle = {
    background: "#111827", border: "1px solid var(--border2)", borderRadius: 8,
    color: "var(--text)", fontSize: "0.8rem", padding: "0.4rem 0.6rem", width: "100%",
  } as const;

  const catCols = analyzed?.columns.filter(c => !c.is_numeric) ?? [];
  const hasCat  = catCols.length > 0;
  const targetEncodingSelected = encodeMethod === "target";
  const targetEncodingWarn = targetEncodingSelected && !target;

  const beforeScore = analyzed ? computeQualityScore(analyzed.rows, analyzed.total_missing, analyzed.columns) : 0;
  const afterScore  = result   ? computeQualityScore(result.rows_after, result.total_missing, result.columns) : 0;

  // Lock body scroll in configure mode so panels scroll independently
  useEffect(() => {
    if (step === "configure") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  return (
    <div style={{
      ...(step === "configure"
        ? { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }
        : { minHeight: "100vh" }),
      color: "var(--text)",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } body { background: ${PAGE_BG}; }`}</style>
      <ParticleBackground />

      {/* Page header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <button
              onClick={() => router.push("/#capabilities")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12L4 7l5-5" />
              </svg>
              Portfolio
            </button>
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>ML Capabilities</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Data Preprocessing</span>
            </div>
          </div>
          <StepIndicator step={step} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1140, margin: "0 auto", width: "100%",
        ...(step === "configure"
          ? { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "1.25rem 1.5rem 0" }
          : { padding: "2.5rem 1.5rem 4rem" }),
      }}>

        {/* ── Upload ── */}
        {step === "upload" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem", textAlign: "center" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
                Clean your dataset before training
              </h1>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>
                Upload any CSV. We will analyze it, give you smart recommendations, and let you configure every step of the cleaning pipeline.
              </p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? ACCENT : "rgba(255,255,255,0.15)"}`,
                borderRadius: 16, padding: "3.5rem 2rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem",
                cursor: "pointer", transition: "border-color 0.2s",
                background: dragging ? `${ACCENT}08` : "rgba(255,255,255,0.02)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem", fontSize: "1rem" }}>Drop your CSV here</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text3)" }}>or click to browse</div>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.25rem" }}>
                Supports any labeled CSV file
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {analyzing && (
              <div style={{ textAlign: "center", marginTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", color: "var(--text3)", fontSize: "0.85rem" }}>
                <div style={{ width: 16, height: 16, borderRadius: 9999, border: `2px solid ${ACCENT}33`, borderTopColor: ACCENT, animation: "spin 0.7s linear infinite" }} />
                Analyzing dataset...
              </div>
            )}
            {error && (
              <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.82rem" }}>{error}</div>
            )}
          </div>
        )}

        {/* ── Configure ── */}
        {step === "configure" && analyzed && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Stats + Presets bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1rem", flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {[
                  { label: "Rows", value: analyzed.rows.toLocaleString() },
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
              <div style={{ width: 280, minWidth: 250, flexShrink: 0, overflowY: "auto", paddingRight: 6 }}>
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
              </div>

              {/* Right: config controls */}
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", paddingRight: 4 }}>

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
                            border: `1px solid ${dropped ? "#ef4444" : col.is_numeric ? `${ACCENT}44` : "var(--border2)"}`,
                            background: dropped ? "rgba(239,68,68,0.12)" : col.is_numeric ? `${ACCENT}10` : "var(--border)",
                            color: dropped ? "#f87171" : col.is_numeric ? ACCENT : "var(--text2)",
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", padding: "1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
                  <Toggle on={removeDups}     onChange={v => { setRemoveDups(v); setActivePreset("custom"); }}     label="Remove Duplicates" />
                  <Toggle on={removeOutliers} onChange={v => { setRemoveOutliers(v); setActivePreset("custom"); }} label="Remove Outliers (IQR)" />
                  <Toggle on={fixSkewness}    onChange={v => { setFixSkewness(v); setActivePreset("custom"); }}    label="Fix Skewness (log1p)" />
                  <Toggle on={standardize}    onChange={v => { setStandardize(v); setActivePreset("custom"); }}    label="Standardize (Z-score)" />
                </div>

                {error && <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.82rem" }}>{error}</div>}

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={reset}
                    style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, fontSize: "0.82rem", background: "var(--border)", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; }}
                  >Back</button>
                  <button onClick={handlePreprocess} disabled={targetEncodingWarn}
                    style={{ flex: 1, padding: "0.6rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700, background: ACCENT, color: "#0b1120", border: "none", cursor: targetEncodingWarn ? "not-allowed" : "pointer", opacity: targetEncodingWarn ? 0.5 : 1, transition: "box-shadow 0.15s, transform 0.15s" }}
                    onMouseEnter={e => { if (!targetEncodingWarn) { e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}66`; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    Preprocess Dataset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 9999, border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "var(--text)", fontSize: "1rem", fontWeight: 600 }}>Cleaning your dataset...</div>
            <div style={{ color: "var(--text3)", fontSize: "0.82rem" }}>Imputing missing values, removing outliers, encoding categoricals</div>
          </div>
        )}

        {/* ── Results ── */}
        {step === "results" && result && (
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", margin: "0 0 0.25rem", letterSpacing: "-0.02em" }}>Preprocessing Complete</h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text3)", margin: 0 }}>{result.preprocessed_filename}</p>
            </div>

            {/* Quality score */}
            <QualityScoreCard before={beforeScore} after={afterScore} />

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Rows",     before: result.rows_before,     after: result.rows_after },
                { label: "Columns",  before: result.cols_before,     after: result.cols_after },
                { label: "Features", before: result.features_before, after: result.features_after },
                { label: "Missing",  before: "—" as string | number, after: result.total_missing },
              ].map(s => {
                const changed  = s.before !== s.after && s.before !== "—";
                const improved = typeof s.before === "number" && typeof s.after === "number"
                  ? (s.label === "Features" ? s.after >= s.before : s.after <= s.before) : true;
                return (
                  <div key={s.label} style={{ padding: "0.85rem 1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{s.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{s.before}</span>
                      <span style={{ color: "var(--border2)" }}>→</span>
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: changed ? (improved ? "#4ade80" : "#f87171") : ACCENT }}>{s.after}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Before / After comparison */}
            {analyzed && result.columns?.length > 0 && (
              <ComparisonView before={analyzed} result={result} />
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={downloadCSV}
                style={{
                  flex: 1, padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700,
                  background: ACCENT, color: "#0b1120", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}66`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download {result.preprocessed_filename}
              </button>
              <button onClick={passToAutoML}
                style={{
                  padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700,
                  background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.4)",
                  color: "#818cf8", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  transition: "box-shadow 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 24px rgba(129,140,248,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Train with AutoML
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 10L10 2M10 2H5M10 2v5" />
                </svg>
              </button>
              <button onClick={goBackToConfigure}
                style={{
                  padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 600,
                  background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                  color: "var(--text2)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12L4 7l5-5" />
                </svg>
                Back to Configure
              </button>
            </div>
            <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
              <button onClick={reset}
                style={{ padding: "0.55rem 1.2rem", borderRadius: 9999, fontSize: "0.8rem", background: "none", border: "1px solid var(--border2)", color: "var(--text3)", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                Process Another Dataset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}