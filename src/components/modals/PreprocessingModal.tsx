"use client";

import { useState, useRef, useCallback } from "react";
import ModalShell from "@/components/modals/ModalShell";
import { ML_UNIFIED_API as API } from "@/config/urls";

const ACCENT = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.65)";

type ColumnInfo = {
  name: string; is_numeric: boolean; nunique: number;
  missing: number; dtype: string; skew?: number;
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
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
      <div
        onClick={() => onChange(!on)}
        style={{
          width: 36, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0,
          background: on ? ACCENT : "var(--border2)", transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
          borderRadius: 9999, background: "#fff", transition: "left 0.2s",
        }} />
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{label}</span>
    </label>
  );
}

export default function PreprocessingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]           = useState<Step>("upload");
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<PrepResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // options
  const [target, setTarget]         = useState("");
  const [dropCols, setDropCols]     = useState<Set<string>>(new Set());
  const [mvNum, setMvNum]           = useState("mean");
  const [mvCat, setMvCat]           = useState("most_frequent");
  const [removeDups, setRemoveDups] = useState(true);
  const [removeOutliers, setRemoveOutliers] = useState(false);
  const [fixSkewness, setFixSkewness]       = useState(false);
  const [encodeMethod, setEncodeMethod]     = useState("none");
  const [standardize, setStandardize]       = useState(false);

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
          filename: file.name,
          csv_b64,
          target_column: target,
          options: {
            remove_duplicates: removeDups,
            mv_num: mvNum,
            mv_cat: mvCat,
            remove_outliers: removeOutliers,
            fix_skewness: fixSkewness,
            encode_method: encodeMethod,
            standardize,
            drop_columns: [...dropCols],
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
              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
                Drop your CSV here
              </div>
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
          {/* Dataset summary */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[
              { label: "Rows", value: analyzed.rows.toLocaleString() },
              { label: "Columns", value: analyzed.columns.length },
              { label: "Missing", value: analyzed.total_missing },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, padding: "0.65rem", borderRadius: 10,
                background: CARD_BG, border: "1px solid var(--border)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: ACCENT }}>{s.value}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Target column */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.4rem" }}>
              Target Column (optional)
            </label>
            <select value={target} onChange={e => setTarget(e.target.value)} style={selectStyle}>
              <option value="">— none —</option>
              {analyzed.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Column list — drop toggles */}
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>
              Columns — click to drop
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", maxHeight: 140, overflowY: "auto" }}>
              {analyzed.columns.map(col => {
                const dropped = dropCols.has(col.name);
                const missingPct = analyzed.rows > 0 ? Math.round((col.missing / analyzed.rows) * 100) : 0;
                return (
                  <button
                    key={col.name}
                    onClick={() => setDropCols(prev => {
                      const n = new Set(prev);
                      dropped ? n.delete(col.name) : n.add(col.name);
                      return n;
                    })}
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
                    {missingPct > 0 && (
                      <span style={{ marginLeft: 4, opacity: 0.7 }}>{missingPct}%</span>
                    )}
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

          {/* Missing values */}
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
            </div>
          )}

          {/* Toggles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", padding: "1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
            <Toggle on={removeDups}      onChange={setRemoveDups}      label="Remove Duplicates" />
            <Toggle on={removeOutliers}  onChange={setRemoveOutliers}  label="Remove Outliers (IQR)" />
            <Toggle on={fixSkewness}     onChange={setFixSkewness}     label="Fix Skewness (log1p)" />
            <Toggle on={standardize}     onChange={setStandardize}     label="Standardize (Z-score)" />
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
            <button onClick={handlePreprocess} style={{
              flex: 1, padding: "0.6rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem",
              fontWeight: 700, background: ACCENT, color: "#0b1120", border: "none", cursor: "pointer",
            }}>
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
          {/* Before / After grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Rows",     before: result.rows_before,     after: result.rows_after },
              { label: "Columns",  before: result.cols_before,     after: result.cols_after },
              { label: "Features", before: result.features_before, after: result.features_after },
              { label: "Missing",  before: "—",                    after: result.total_missing },
            ].map(s => {
              const changed = s.before !== s.after && s.before !== "—";
              const improved = typeof s.before === "number" && typeof s.after === "number"
                ? (s.label === "Features" ? s.after >= s.before : s.after <= s.before)
                : true;
              return (
                <div key={s.label} style={{
                  padding: "0.85rem 1rem", borderRadius: 12,
                  background: CARD_BG, border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                    {s.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{s.before}</span>
                    <span style={{ color: "var(--border2)" }}>→</span>
                    <span style={{
                      fontSize: "1rem", fontWeight: 700,
                      color: changed ? (improved ? "#4ade80" : "#f87171") : ACCENT,
                    }}>
                      {s.after}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* OHE note */}
          {result.ohe_cols_added > 0 && (
            <div style={{ fontSize: "0.78rem", color: "var(--text3)", textAlign: "center" }}>
              One-hot encoding added {result.ohe_cols_added} columns
            </div>
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
            background: "none", border: "1px solid var(--border2)",
            color: "var(--text3)", cursor: "pointer",
          }}>
            Process Another Dataset
          </button>
        </div>
      )}

    </ModalShell>
  );
}