"use client";

import { useState, useRef, useCallback } from "react";
import ModalShell from "@/components/modals/ModalShell";
import { ML_UNIFIED_API as API } from "@/config/urls";

const ACCENT = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.65)";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function missingColor(pct: number) {
  return pct > 30 ? "#f87171" : pct > 10 ? "#fb923c" : "#4ade80";
}

function skewBadge(s: number) {
  const abs = Math.abs(s);
  if (abs >= 1)   return { label: "High skew",  color: "#f87171", desc: "Long tail — log transform recommended" };
  if (abs >= 0.5) return { label: "Moderate",   color: "#fb923c", desc: "Slight asymmetry" };
  return               { label: "Normal",      color: "#4ade80", desc: "Roughly symmetric" };
}

function fmtNum(v: number) {
  if (Math.abs(v) >= 10000) return v.toFixed(0);
  if (Math.abs(v) >= 100)   return v.toFixed(1);
  if (Math.abs(v) >= 10)    return v.toFixed(1);
  return v.toFixed(2);
}

// ── Mini bell curve SVG ───────────────────────────────────────────────────────

function MiniDistChart({ col, width = 140 }: { col: ColumnInfo; width?: number }) {
  const { min = 0, max = 0, mean = 0, std = 1, skew = 0 } = col;
  const W = width, H = 44;

  if (min === max) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={W / 2} y1={H} x2={W / 2} y2={4} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
        <circle cx={W / 2} cy={4} r={2.5} fill={ACCENT} />
      </svg>
    );
  }

  const N = 80;
  const range = max - min;
  // Dampen skew so the asymmetry is visible but not extreme
  const skewFactor = Math.max(-0.7, Math.min(0.7, (skew ?? 0) * 0.28));

  const yVals: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = min + (i / N) * range;
    const isRight = x >= mean;
    const effStd = Math.max(range * 0.001, isRight
      ? (std || range * 0.2) * (1 + skewFactor)
      : (std || range * 0.2) * (1 - skewFactor));
    const z = (x - mean) / effStd;
    yVals.push(Math.exp(-0.5 * z * z));
  }

  const maxY = Math.max(...yVals, 0.01);
  const pts = yVals.map((y, i) => ({
    sx: (i / N) * W,
    sy: H - 2 - ((y / maxY) * (H - 8)),
  }));

  const fillPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ")
    + ` L${W},${H} L0,${H} Z`;
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");

  // Mean marker x position
  const meanX = ((mean - min) / range) * W;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <path d={fillPath} fill={ACCENT} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Mean line */}
      <line x1={meanX} y1={H} x2={meanX} y2={4} stroke={ACCENT} strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.7" />
    </svg>
  );
}

// ── Before / After Comparison ────────────────────────────────────────────────

function ComparisonView({ before, result }: { before: AnalyzeResult; result: PrepResult }) {
  const [open, setOpen] = useState(true);

  const beforeMap = new Map(before.columns.map(c => [c.name, c]));
  const afterMap  = new Map(result.columns.map(c => [c.name, c]));

  // Shared numeric columns that can be compared
  const comparable = before.columns.filter(c => c.is_numeric && afterMap.has(c.name));
  // Columns removed (dropped or encoded away)
  const removed = before.columns.filter(c => !afterMap.has(c.name));
  // New columns added (OHE)
  const added = result.columns.filter(c => !beforeMap.has(c.name));

  function changeTags(b: ColumnInfo, a: ColumnInfo) {
    const tags: { label: string; color: string }[] = [];
    if (b.missing > 0 && a.missing === 0)
      tags.push({ label: "Missing filled", color: "#4ade80" });
    const skewImproved = Math.abs(a.skew ?? 0) < Math.abs(b.skew ?? 0) - 0.3;
    if (skewImproved)
      tags.push({ label: "Skew reduced", color: ACCENT });
    const wasStd = Math.abs(a.mean ?? 0) < 0.05 && Math.abs((a.std ?? 1) - 1) < 0.1;
    if (wasStd && (Math.abs(b.mean ?? 0) > 1 || Math.abs((b.std ?? 1) - 1) > 0.1))
      tags.push({ label: "Standardized", color: "#a78bfa" });
    if (tags.length === 0)
      tags.push({ label: "Unchanged", color: "var(--text3)" });
    return tags;
  }

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.65rem 1rem", background: CARD_BG, border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Before vs After
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)" }}>
            {comparable.length} column{comparable.length !== 1 ? "s" : ""} compared
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", background: "rgba(11,17,32,0.6)" }}>

          {/* Legend */}
          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.65rem", color: "var(--text3)", marginBottom: "0.1rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ display: "inline-block", width: 28, height: 2, background: `${ACCENT}55`, borderRadius: 2 }} />
              Before
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ display: "inline-block", width: 28, height: 2, background: ACCENT, borderRadius: 2 }} />
              After
            </span>
          </div>

          {/* Column comparison cards */}
          {comparable.slice(0, 7).map(beforeCol => {
            const afterCol = afterMap.get(beforeCol.name)!;
            const tags = changeTags(beforeCol, afterCol);
            const unchanged = tags.length === 1 && tags[0].label === "Unchanged";
            return (
              <div key={beforeCol.name} style={{
                borderRadius: 10, border: `1px solid ${unchanged ? "var(--border)" : `${ACCENT}30`}`,
                background: unchanged ? "rgba(11,17,32,0.4)" : `${ACCENT}06`,
                padding: "0.65rem 0.8rem",
              }}>
                {/* Column name + tags */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                    {beforeCol.name}
                  </span>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {tags.map(t => (
                      <span key={t.label} style={{
                        fontSize: "0.6rem", padding: "1px 7px", borderRadius: 9999, fontWeight: 600,
                        background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33`,
                      }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Side-by-side curves */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {[
                    { label: "Before", col: beforeCol, dim: true },
                    { label: "After",  col: afterCol,  dim: false },
                  ].map(({ label, col, dim }) => (
                    <div key={label}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: "0.25rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        {label}
                      </div>
                      {/* Bell curve — dim before, vivid after */}
                      <div style={{ opacity: dim ? 0.45 : 1 }}>
                        <MiniDistChart col={col} width={220} />
                      </div>
                      {/* Stats */}
                      <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.6rem", fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>
                        <span><span style={{ color: "var(--text3)" }}>mean </span>
                          <span style={{ color: dim ? "var(--text2)" : ACCENT, fontWeight: dim ? 400 : 700 }}>{fmtNum(col.mean ?? 0)}</span></span>
                        <span><span style={{ color: "var(--text3)" }}>std </span>
                          <span style={{ color: "var(--text2)" }}>{fmtNum(col.std ?? 0)}</span></span>
                        {col.missing > 0 && (
                          <span style={{ color: "#f87171" }}>{col.missing} missing</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {comparable.length > 7 && (
            <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center" }}>
              +{comparable.length - 7} more columns
            </div>
          )}

          {/* Removed / Added columns */}
          {(removed.length > 0 || added.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
              {removed.map(c => (
                <span key={c.name} style={{
                  padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem",
                  background: "rgba(239,68,68,0.1)", color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.25)", textDecoration: "line-through",
                }}>
                  {c.name}
                </span>
              ))}
              {added.length > 0 && (
                <span style={{
                  padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem",
                  background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30`,
                }}>
                  +{added.length} new column{added.length > 1 ? "s" : ""} (encoding)
                </span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Dataset Overview Panel ────────────────────────────────────────────────────

function DatasetOverview({ analyzed }: { analyzed: AnalyzeResult }) {
  const [open, setOpen] = useState(true);

  const numCols = analyzed.columns.filter(c => c.is_numeric);
  const catCols = analyzed.columns.filter(c => !c.is_numeric);
  const colsWithMissing = analyzed.columns.filter(c => c.missing > 0)
    .sort((a, b) => b.missing - a.missing);

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.65rem 1rem", background: CARD_BG, border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Dataset Overview
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 600,
            background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
            {numCols.length} numeric
          </span>
          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 600,
            background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
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

          {/* Missing values chart */}
          {colsWithMissing.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.55rem" }}>
                Missing Values
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {colsWithMissing.slice(0, 8).map(col => {
                  const pct = Math.round((col.missing / analyzed.rows) * 100);
                  const clr = missingColor(pct);
                  return (
                    <div key={col.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text2)", width: 110, flexShrink: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {col.name}
                      </span>
                      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`, minWidth: 4,
                          background: clr, borderRadius: 9999, transition: "width 0.4s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: "0.68rem", color: clr, width: 52, flexShrink: 0,
                        fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                        {col.missing} ({pct}%)
                      </span>
                    </div>
                  );
                })}
                {colsWithMissing.length > 8 && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center", marginTop: 2 }}>
                    +{colsWithMissing.length - 8} more columns with missing values
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Numeric distributions — card per column */}
          {numCols.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
                Numeric Distributions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {numCols.slice(0, 8).map(col => {
                  const badge = skewBadge(col.skew ?? 0);
                  const missingPct = analyzed.rows > 0 ? Math.round((col.missing / analyzed.rows) * 100) : 0;
                  return (
                    <div key={col.name} style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.65rem 0.85rem", borderRadius: 10,
                      background: "rgba(11,17,32,0.7)", border: "1px solid var(--border)",
                    }}>
                      {/* Name + meta */}
                      <div style={{ width: 88, flexShrink: 0 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {col.name}
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 2 }}>
                          {col.nunique} unique{missingPct > 0 ? ` · ${missingPct}% missing` : ""}
                        </div>
                      </div>

                      {/* Bell curve */}
                      <MiniDistChart col={col} />

                      {/* Stats */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.67rem", fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}>
                          <span><span style={{ color: "var(--text3)" }}>min </span><span style={{ color: "var(--text2)" }}>{fmtNum(col.min ?? 0)}</span></span>
                          <span><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: ACCENT, fontWeight: 700 }}>{fmtNum(col.mean ?? 0)}</span></span>
                          <span><span style={{ color: "var(--text3)" }}>max </span><span style={{ color: "var(--text2)" }}>{fmtNum(col.max ?? 0)}</span></span>
                        </div>
                        <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>
                          std {fmtNum(col.std ?? 0)} · {badge.desc}
                        </div>
                      </div>

                      {/* Skew badge */}
                      <span style={{
                        fontSize: "0.62rem", padding: "2px 8px", borderRadius: 9999, flexShrink: 0,
                        background: `${badge.color}18`, color: badge.color,
                        border: `1px solid ${badge.color}33`, fontWeight: 600,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
                {numCols.length > 8 && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center", paddingTop: "0.25rem" }}>
                    +{numCols.length - 8} more numeric columns
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Categorical quick stats */}
          {catCols.length > 0 && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.55rem" }}>
                Categorical Columns
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {catCols.slice(0, 10).map(col => (
                  <div key={col.name} style={{
                    padding: "3px 10px", borderRadius: 9999, fontSize: "0.7rem",
                    background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc",
                  }}>
                    {col.name}
                    <span style={{ opacity: 0.6, marginLeft: 4 }}>{col.nunique} unique</span>
                  </div>
                ))}
                {catCols.length > 10 && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", padding: "3px 6px" }}>
                    +{catCols.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PreprocessingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<PrepResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [target, setTarget]                   = useState("");
  const [dropCols, setDropCols]               = useState<Set<string>>(new Set());
  const [mvNum, setMvNum]                     = useState("mean");
  const [mvCat, setMvCat]                     = useState("most_frequent");
  const [removeDups, setRemoveDups]           = useState(true);
  const [removeOutliers, setRemoveOutliers]   = useState(false);
  const [fixSkewness, setFixSkewness]         = useState(false);
  const [encodeMethod, setEncodeMethod]       = useState("none");
  const [standardize, setStandardize]         = useState(false);

  const analyze = useCallback(async (f: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data);
      setTarget(data.suggested_target);
      setStep("configure");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setFile(f);
    analyze(f);
  }, [analyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handlePreprocess = useCallback(async () => {
    if (!file || !analyzed) return;
    setStep("processing");
    setError(null);
    try {
      const csv_b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API}/automl/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name, csv_b64, target_column: target,
          options: {
            remove_duplicates: removeDups, mv_num: mvNum, mv_cat: mvCat,
            remove_outliers: removeOutliers, fix_skewness: fixSkewness,
            encode_method: encodeMethod, standardize, drop_columns: [...dropCols],
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: PrepResult = await res.json();
      setResult(data);
      setStep("results");
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
    a.href = url; a.download = result.preprocessed_filename;
    a.click(); URL.revokeObjectURL(url);
  }, [result]);

  const reset = useCallback(() => {
    setStep("upload"); setFile(null); setAnalyzed(null);
    setResult(null); setError(null); setDropCols(new Set());
    setTarget(""); setMvNum("mean"); setMvCat("most_frequent");
    setRemoveDups(true); setRemoveOutliers(false); setFixSkewness(false);
    setEncodeMethod("none"); setStandardize(false);
  }, []);

  const selectStyle = {
    background: "#111827", border: "1px solid var(--border2)", borderRadius: 8,
    color: "var(--text)", fontSize: "0.8rem", padding: "0.4rem 0.6rem", width: "100%",
  } as const;

  const catCols = analyzed?.columns.filter(c => !c.is_numeric) ?? [];
  const hasCat  = catCols.length > 0;
  const targetEncodingSelected = encodeMethod === "target";
  const targetEncodingWarn = targetEncodingSelected && !target;

  return (
    <ModalShell onClose={onClose} title="Data Preprocessing" eyebrow="ML Capabilities" accent={ACCENT}>

      {/* ── Upload ──────────────────────────────────────────────── */}
      {step === "upload" && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? ACCENT : "var(--border2)"}`,
              borderRadius: 14, padding: "3rem 2rem",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
              cursor: "pointer", transition: "border-color 0.2s",
              background: dragging ? `${ACCENT}08` : "transparent",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>Drop your CSV here</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>or click to browse</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {analyzing && (
            <div style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--text3)", fontSize: "0.82rem" }}>
              Analyzing dataset...
            </div>
          )}
          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", fontSize: "0.82rem" }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Configure ────────────────────────────────────────────── */}
      {step === "configure" && analyzed && (
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

          {/* Dataset visualization */}
          <DatasetOverview analyzed={analyzed} />

          {/* Target column */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
              Target Column (optional)
            </label>
            <select value={target} onChange={e => setTarget(e.target.value)} style={selectStyle}>
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
              <select value={mvNum} onChange={e => setMvNum(e.target.value)} style={selectStyle}>
                {MV_NUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {hasCat && (
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
                  Categorical Imputation
                </label>
                <select value={mvCat} onChange={e => setMvCat(e.target.value)} style={selectStyle}>
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
              <select value={encodeMethod} onChange={e => setEncodeMethod(e.target.value)} style={selectStyle}>
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
            <button onClick={reset} style={{
              padding: "0.6rem 1.2rem", borderRadius: 9999, fontSize: "0.82rem",
              background: "var(--border)", border: "1px solid var(--border2)",
              color: "var(--text2)", cursor: "pointer",
            }}>
              Back
            </button>
            <button
              onClick={handlePreprocess}
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
      )}

      {/* ── Processing ───────────────────────────────────────────── */}
      {step === "processing" && (
        <div style={{ textAlign: "center", padding: "3rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 9999,
            border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT,
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Cleaning your dataset...</div>
          <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>
            Imputing missing values, removing outliers, encoding categoricals
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {step === "results" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Rows",     before: result.rows_before,     after: result.rows_after },
              { label: "Columns",  before: result.cols_before,     after: result.cols_after },
              { label: "Features", before: result.features_before, after: result.features_after },
              { label: "Missing",  before: "—",                    after: result.total_missing },
            ].map(s => {
              const changed = s.before !== s.after && s.before !== "—";
              const improved = typeof s.before === "number" && typeof s.after === "number"
                ? (s.label === "Features" ? s.after >= s.before : s.after <= s.before) : true;
              return (
                <div key={s.label} style={{ padding: "0.85rem 1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                    {s.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{s.before}</span>
                    <span style={{ color: "var(--border2)" }}>→</span>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: changed ? (improved ? "#4ade80" : "#f87171") : ACCENT }}>
                      {s.after}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Before / After comparison */}
          {analyzed && result.columns?.length > 0 && (
            <ComparisonView before={analyzed} result={result} />
          )}

          <button onClick={downloadCSV} style={{
            padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700,
            background: ACCENT, color: "#0b1120", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {result.preprocessed_filename}
          </button>

          <button onClick={reset} style={{
            padding: "0.55rem 1.2rem", borderRadius: 9999, fontSize: "0.8rem",
            background: "none", border: "1px solid var(--border2)", color: "var(--text3)", cursor: "pointer",
          }}>
            Process Another Dataset
          </button>
        </div>
      )}

    </ModalShell>
  );
}