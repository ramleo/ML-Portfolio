"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import type { ColInfo, SelectionOpts, FeatureScore, PCAComponent, SelectionResult, KBestMethod } from "@/lib/fsAlgorithms";
import { parseCSV, analyzeColumns, runSelection } from "@/lib/fsAlgorithms";

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = "#fb923c";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 600, color,
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 9999,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function TechPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 500, color: ACCENT,
      background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`,
      borderRadius: 6, padding: "2px 10px",
    }}>{label}</span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | "variance" | "correlation" | "topk" | "rfe" | "selectkbest"
  | "forward" | "exhaustive" | "chisq" | "kendall"
  | "lasso" | "ridge" | "tree"
  | "pca" | "umap";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeatureSelectionPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cols, setCols] = useState<ColInfo[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);

  const [opts, setOpts] = useState<SelectionOpts>({
    targetCol: "",
    useVariance: true,
    varianceThreshold: 0.01,
    useCorrelation: true,
    corrThreshold: 0.9,
    useTopK: false,
    topK: 10,
    useSelectKBest: false,
    selectKBestK: 10,
    kBestMethod: "f_regression",
    useKendall: false,
    kendallTopK: 10,
    useChiSq: false,
    chiSqTopK: 10,
    useRFE: false,
    rfeTargetK: 10,
    useLasso: false,
    lassoAlpha: 0.01,
    lassoTopK: 10,
    useRidge: false,
    ridgeAlpha: 1.0,
    ridgeTopK: 10,
    useTree: false,
    treeTopK: 10,
    treeNTrees: 50,
    useForward: false,
    forwardK: 10,
    useExhaustive: false,
    exhaustiveK: 5,
    usePCA: false,
    pcaComponents: 3,
    useUMAP: false,
    umapComponents: 2,
    umapNeighbors: 15,
  });

  const [result, setResult] = useState<SelectionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("variance");

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) return;
      const analyzed = analyzeColumns(headers, rows);
      setCols(analyzed);
      setFileName(file.name);
      setRowCount(rows.length);
      setResult(null);
      const last = analyzed[analyzed.length - 1];
      if (last && last.nunique <= 20) {
        setOpts(o => ({
          ...o, targetCol: last.name,
          kBestMethod: last.type === "categorical" ? "f_classif" : "f_regression",
        }));
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }, [handleFile]);

  const handleRun = useCallback(() => {
    if (!cols.length) return;
    setRunning(true);
    setTimeout(() => {
      setResult(runSelection(cols, opts));
      setRunning(false);
    }, 50);
  }, [cols, opts]);

  const handleDownload = useCallback(() => {
    if (!result?.csvText) return;
    const blob = new Blob([result.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.csv$/i, "") + "_selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  const handleDownloadPCA = useCallback(() => {
    if (!result?.pcaResult?.csvText) return;
    const blob = new Blob([result.pcaResult.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.csv$/i, "") + "_pca.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  const handleDownloadUMAP = useCallback(() => {
    if (!result?.umapResult?.csvText) return;
    const blob = new Blob([result.umapResult.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.csv$/i, "") + "_umap.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  const hasFile = cols.length > 0;
  const numericCols = cols.filter(c => c.type === "numeric");
  const categoricalCols = cols.filter(c => c.type === "categorical");
  const candidateCount = numericCols.filter(c => c.name !== opts.targetCol).length;
  const targetInfo = cols.find(c => c.name === opts.targetCol) ?? null;

  const TABS: { id: TabId; label: string; enabled: boolean }[] = [
    { id: "variance",    label: "Variance",   enabled: opts.useVariance },
    { id: "correlation", label: "Corr",       enabled: opts.useCorrelation },
    { id: "topk",        label: "Top-K",      enabled: opts.useTopK },
    { id: "selectkbest", label: "K Best",     enabled: opts.useSelectKBest },
    { id: "kendall",     label: "Kendall τ",  enabled: opts.useKendall },
    { id: "chisq",       label: "Chi-sq",     enabled: opts.useChiSq },
    { id: "rfe",         label: "RFE",        enabled: opts.useRFE },
    { id: "lasso",       label: "Lasso",      enabled: opts.useLasso },
    { id: "ridge",       label: "Ridge",      enabled: opts.useRidge },
    { id: "tree",        label: "Tree",       enabled: opts.useTree },
    { id: "forward",     label: "Forward",    enabled: opts.useForward },
    { id: "exhaustive",  label: "Exhaustive", enabled: opts.useExhaustive },
    { id: "pca",         label: "PCA",        enabled: opts.usePCA },
    { id: "umap",        label: "UMAP",       enabled: opts.useUMAP },
  ];

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          maxWidth: 960, margin: "0 auto", padding: "0 1.5rem",
          height: 60, display: "flex", alignItems: "center", gap: "1.5rem",
        }}>
          <button
            onClick={() => router.push("/#capabilities")}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Badge label="Step 3" color={ACCENT} />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Selection</span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge label="runs in browser" color="#22c55e" />
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 960, margin: "0 auto",
        padding: "2.5rem 1.5rem 5rem",
        display: "flex", flexDirection: "column", gap: "1.5rem",
      }}>

        {/* ── Hero ── */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Keeping Only What Matters
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                Upload a CSV and apply fourteen complementary methods — variance threshold, correlation filter,
                top-K MI scoring, SelectKBest, Kendall tau, chi-squared, RFE, Lasso, Ridge, tree importance,
                forward selection, exhaustive search, PCA, and UMAP — to reduce your feature set.
                Download the result. Everything runs in your browser.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
              {["Variance", "Pearson r", "MI Score", "RFE", "Lasso", "PCA", "UMAP"].map(l => (
                <TechPill key={l} label={l} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Upload ── */}
        <div
          style={{
            ...CARD, cursor: "pointer", textAlign: "center",
            borderStyle: hasFile ? "solid" : "dashed",
            borderColor: hasFile ? `${ACCENT}33` : "rgba(255,255,255,0.15)",
            transition: "border-color 0.2s",
          }}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input
            ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {hasFile ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{fileName}</div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text3)" }}>
                    {rowCount.toLocaleString()} rows · {cols.length} columns ({numericCols.length} numeric, {categoricalCols.length} categorical)
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: ACCENT, fontWeight: 500 }}>Click to replace</span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem", opacity: 0.25, lineHeight: 1 }}>+</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
                Drop a CSV or click to upload
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
                Any tabular dataset — processed entirely in your browser, never leaves this page
              </div>
            </div>
          )}
        </div>

        {hasFile && (
          <>
            {/* ── Target ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Target Column
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <select
                  value={opts.targetCol}
                  onChange={e => {
                    const col = cols.find(c => c.name === e.target.value);
                    setOpts(o => ({
                      ...o,
                      targetCol: e.target.value,
                      kBestMethod: col?.type === "categorical" ? "f_classif" : "f_regression",
                    }));
                  }}
                  style={{
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, color: "var(--text)", fontSize: "0.82rem",
                    padding: "0.35rem 0.65rem", outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">(none — rank by variance)</option>
                  {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div style={{ fontSize: "0.76rem", color: "var(--text3)", lineHeight: 1.55 }}>
                  {opts.targetCol
                    ? `${targetInfo?.type === "categorical" ? "Categorical" : "Numeric"} target — MI and F-scores computed against this column.`
                    : "No target — features ranked by normalized variance."}
                </div>
              </div>
            </div>

            {/* ── Method config ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                Selection Methods
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: "1 1 auto",
                        padding: "0.4rem 0.6rem", border: "none", borderRadius: 6, cursor: "pointer",
                        fontSize: "0.74rem", fontWeight: 600, transition: "all 0.15s",
                        background: active ? ACCENT : "transparent",
                        color: active ? "#000" : tab.enabled ? "var(--text)" : "var(--text3)",
                        boxShadow: active ? `0 0 10px ${ACCENT}44` : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                      {tab.enabled && !active && (
                        <span style={{ marginLeft: "0.35rem", display: "inline-block", width: 5, height: 5, borderRadius: 9999, background: ACCENT, verticalAlign: "middle" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Variance tab ── */}
              {activeTab === "variance" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useVariance}
                      onChange={e => setOpts(o => ({ ...o, useVariance: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable variance threshold</span>
                  </label>
                  <div style={{ opacity: opts.useVariance ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Drop numeric features whose variance falls below the threshold. Near-zero variance means a feature is nearly constant and carries almost no predictive information.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Threshold</span>
                      <input
                        type="number" min="0" step="0.001"
                        value={opts.varianceThreshold}
                        onChange={e => setOpts(o => ({ ...o, varianceThreshold: Math.max(0, parseFloat(e.target.value) || 0) }))}
                        disabled={!opts.useVariance}
                        style={{
                          width: 110, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6, color: ACCENT, fontSize: "0.84rem", fontWeight: 700,
                          padding: "0.3rem 0.6rem", outline: "none",
                        }}
                      />
                    </div>
                    {hasFile && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.6rem" }}>
                        Would drop{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {numericCols.filter(c => c.variance < opts.varianceThreshold && c.name !== opts.targetCol).length}
                        </strong>{" "}of{" "}
                        <strong style={{ color: "var(--text)" }}>{candidateCount}</strong>{" "}
                        numeric features · range:{" "}
                        {candidateCount > 0
                          ? `${Math.min(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)} – ${Math.max(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)}`
                          : "—"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Correlation tab ── */}
              {activeTab === "correlation" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useCorrelation}
                      onChange={e => setOpts(o => ({ ...o, useCorrelation: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable correlation filter</span>
                  </label>
                  <div style={{ opacity: opts.useCorrelation ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      When two features have |r| above the threshold, the one with the lower MI score is dropped. Removes multicollinearity without discarding predictive signal.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0, width: 52 }}>|r| &ge;</span>
                      <input
                        type="range" min="0.5" max="1.0" step="0.01"
                        value={opts.corrThreshold}
                        onChange={e => setOpts(o => ({ ...o, corrThreshold: parseFloat(e.target.value) }))}
                        disabled={!opts.useCorrelation}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {opts.corrThreshold.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Top-K tab ── */}
              {activeTab === "topk" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useTopK}
                      onChange={e => setOpts(o => ({ ...o, useTopK: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable top-K by MI score</span>
                  </label>
                  <div style={{ opacity: opts.useTopK ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      After variance and correlation filters, keep only the K features with the highest mutual information score. Applied before RFE and SelectKBest.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.topK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, topK: parseInt(e.target.value) }))}
                        disabled={!opts.useTopK}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.topK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SelectKBest tab ── */}
              {activeTab === "selectkbest" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useSelectKBest}
                      onChange={e => setOpts(o => ({ ...o, useSelectKBest: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Select K Best</span>
                  </label>
                  <div style={{ opacity: opts.useSelectKBest ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Ranks features by a univariate score and keeps the top K. Three scoring functions available — choose based on your target type.
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Scoring function</div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {([
                          { id: "f_regression", label: "f_regression", desc: "F(1,n-2) stat for linear association · numeric target" },
                          { id: "f_classif",    label: "f_classif",    desc: "One-way ANOVA F-stat · categorical target" },
                          { id: "mi",           label: "mutual_info",  desc: "MI approximation via Pearson correlation · any target" },
                        ] as { id: KBestMethod; label: string; desc: string }[]).map(m => (
                          <button
                            key={m.id}
                            onClick={() => setOpts(o => ({ ...o, kBestMethod: m.id }))}
                            disabled={!opts.useSelectKBest}
                            title={m.desc}
                            style={{
                              padding: "0.35rem 0.8rem", borderRadius: 6, cursor: "pointer",
                              fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
                              border: `1px solid ${opts.kBestMethod === m.id ? ACCENT : "rgba(255,255,255,0.12)"}`,
                              background: opts.kBestMethod === m.id ? `${ACCENT}18` : "rgba(0,0,0,0.2)",
                              color: opts.kBestMethod === m.id ? ACCENT : "var(--text3)",
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: "0.71rem", color: "var(--text3)", marginTop: "0.4rem" }}>
                        {opts.kBestMethod === "f_regression" && "F = r² × (n-2) / (1-r²) — measures linear association strength with a numeric target."}
                        {opts.kBestMethod === "f_classif" && "One-way ANOVA: between-class SS / within-class SS — measures how well a feature separates class groups."}
                        {opts.kBestMethod === "mi" && "MI ≈ −0.5 × log(1 − r²) — information-theoretic score, works for any target type."}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep best</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.selectKBestK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, selectKBestK: parseInt(e.target.value) }))}
                        disabled={!opts.useSelectKBest}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.selectKBestK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                      Results show normalized F/MI scores as a secondary bar in the ranking table.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Kendall tab ── */}
              {activeTab === "kendall" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useKendall}
                      onChange={e => setOpts(o => ({ ...o, useKendall: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Kendall's Tau Filter</span>
                  </label>
                  <div style={{ opacity: opts.useKendall ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Rank correlation — counts concordant vs discordant observation pairs. Robust for monotonic non-linear relationships. |τ| close to 1 = strong association. Capped at 500 rows for performance.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.kendallTopK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, kendallTopK: parseInt(e.target.value) }))}
                        disabled={!opts.useKendall}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.kendallTopK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    {!opts.targetCol && (
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                        Select a target column for meaningful scores.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Chi-sq tab ── */}
              {activeTab === "chisq" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useChiSq}
                      onChange={e => setOpts(o => ({ ...o, useChiSq: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Chi-squared Filter</span>
                  </label>
                  <div style={{ opacity: opts.useChiSq ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Bins each numeric feature into quartiles and tests independence against the target using χ². Higher χ² = stronger dependence on target. Works best with a categorical target.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.chiSqTopK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, chiSqTopK: parseInt(e.target.value) }))}
                        disabled={!opts.useChiSq}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.chiSqTopK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    {!opts.targetCol && (
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                        Select a target column for meaningful scores.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── RFE tab ── */}
              {activeTab === "rfe" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useRFE}
                      onChange={e => setOpts(o => ({ ...o, useRFE: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Recursive Feature Elimination</span>
                  </label>
                  <div style={{ opacity: opts.useRFE ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Iterative backward elimination. Each round, the feature with the lowest importance score is removed. Importance = MI(feature, target) × (1 − 0.35 × avg_redundancy_with_remaining). This penalizes features that are both weak and redundant, producing a different elimination order than pure MI ranking.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, rfeTargetK: parseInt(e.target.value) }))}
                        disabled={!opts.useRFE}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                      Results show the elimination round for each dropped feature in the ranking table.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Lasso tab ── */}
              {activeTab === "lasso" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useLasso}
                      onChange={e => setOpts(o => ({ ...o, useLasso: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Lasso (L1)</span>
                  </label>
                  <div style={{ opacity: opts.useLasso ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Coordinate descent with L1 penalty. Shrinks weak feature weights toward exactly zero — naturally sparse. Higher alpha = more features zeroed. Requires a target column. Capped at 500 rows.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Alpha</span>
                      <input
                        type="range" min="0.001" max="0.2" step="0.001"
                        value={opts.lassoAlpha}
                        onChange={e => setOpts(o => ({ ...o, lassoAlpha: parseFloat(e.target.value) }))}
                        disabled={!opts.useLasso}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 52, textAlign: "right" }}>
                        {opts.lassoAlpha.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.lassoTopK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, lassoTopK: parseInt(e.target.value) }))}
                        disabled={!opts.useLasso}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.lassoTopK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    {!opts.targetCol && (
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                        Select a target column for meaningful scores.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Ridge tab ── */}
              {activeTab === "ridge" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useRidge}
                      onChange={e => setOpts(o => ({ ...o, useRidge: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Ridge (L2)</span>
                  </label>
                  <div style={{ opacity: opts.useRidge ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Gradient descent with L2 penalty. Penalises large coefficients, especially for collinear features. Features ranked by |coefficient| — nothing zeroed out. Higher alpha = more shrinkage. Capped at 500 rows.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Alpha</span>
                      <input
                        type="range" min="0.1" max="10" step="0.1"
                        value={opts.ridgeAlpha}
                        onChange={e => setOpts(o => ({ ...o, ridgeAlpha: parseFloat(e.target.value) }))}
                        disabled={!opts.useRidge}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {opts.ridgeAlpha.toFixed(1)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.ridgeTopK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, ridgeTopK: parseInt(e.target.value) }))}
                        disabled={!opts.useRidge}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.ridgeTopK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    {!opts.targetCol && (
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                        Select a target column for meaningful scores.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tree tab ── */}
              {activeTab === "tree" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useTree}
                      onChange={e => setOpts(o => ({ ...o, useTree: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Tree Importance</span>
                  </label>
                  <div style={{ opacity: opts.useTree ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      {`Random Forest-style importance: ${opts.treeNTrees} bootstrap trees, each split tries √p random features. Importance = cumulative weighted split gain (Gini for classification, variance for regression). Capped at 1000 rows.`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>N trees</span>
                      <input
                        type="range" min="10" max="200" step="10"
                        value={opts.treeNTrees}
                        onChange={e => setOpts(o => ({ ...o, treeNTrees: parseInt(e.target.value) }))}
                        disabled={!opts.useTree}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {opts.treeNTrees}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.treeTopK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, treeTopK: parseInt(e.target.value) }))}
                        disabled={!opts.useTree}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.treeTopK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    {!opts.targetCol && (
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                        Select a target column for meaningful scores.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Forward tab ── */}
              {activeTab === "forward" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useForward}
                      onChange={e => setOpts(o => ({ ...o, useForward: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Forward Selection</span>
                  </label>
                  <div style={{ opacity: opts.useForward ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Greedy wrapper — starts with an empty set and adds the feature that maximises MI × (1 − 0.2 × avg redundancy with already-selected features) at each step. Prefers strong, diverse features.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.forwardK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, forwardK: parseInt(e.target.value) }))}
                        disabled={!opts.useForward}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.forwardK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Exhaustive tab ── */}
              {activeTab === "exhaustive" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useExhaustive}
                      onChange={e => setOpts(o => ({ ...o, useExhaustive: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Exhaustive Search</span>
                  </label>
                  <div style={{ opacity: opts.useExhaustive ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Evaluates all C(n,k) subsets of size k and picks the one maximising avg MI − 0.3 × avg inter-feature correlation. Automatically falls back to Forward Selection when candidates &gt; 15.
                    </div>
                    {candidateCount > 15 && (
                      <div style={{ fontSize: "0.76rem", color: "#fbbf24", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                        Current dataset has {candidateCount} numeric candidates — will use Forward Selection fallback (feasibility cap is 15).
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Best subset of</span>
                      <input
                        type="range" min="2" max={Math.min(Math.max(candidateCount, 2), 15, 12)} step="1"
                        value={Math.min(opts.exhaustiveK, Math.min(Math.max(candidateCount, 2), 15, 12))}
                        onChange={e => setOpts(o => ({ ...o, exhaustiveK: parseInt(e.target.value) }))}
                        disabled={!opts.useExhaustive}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.exhaustiveK, Math.min(Math.max(candidateCount, 2), 15, 12))} features
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PCA tab ── */}
              {activeTab === "pca" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.usePCA}
                      onChange={e => setOpts(o => ({ ...o, usePCA: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable PCA</span>
                  </label>
                  <div style={{ opacity: opts.usePCA ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Standardises features and projects onto principal components ordered by variance explained. Output CSV replaces numeric features with PC1, PC2, etc. Operates on all numeric candidates — does not affect the keep/drop list.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Components</span>
                      <input
                        type="range" min="1" max={Math.min(Math.max(candidateCount, 1), 10)} step="1"
                        value={Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
                        onChange={e => setOpts(o => ({ ...o, pcaComponents: parseInt(e.target.value) }))}
                        disabled={!opts.usePCA}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                      PCA and UMAP produce a separate transformed CSV downloadable below after running.
                    </div>
                  </div>
                </div>
              )}

              {/* ── UMAP tab ── */}
              {activeTab === "umap" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useUMAP}
                      onChange={e => setOpts(o => ({ ...o, useUMAP: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable UMAP (spectral)</span>
                  </label>
                  <div style={{ opacity: opts.useUMAP ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Non-linear dimensionality reduction via spectral embedding of the k-NN affinity graph (Laplacian Eigenmaps). Captures manifold structure invisible to PCA. Capped at 400 rows; remaining rows use nearest-neighbour interpolation.
                    </div>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Dimensions</div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {([2, 3] as const).map(n => (
                          <button
                            key={n}
                            onClick={() => setOpts(o => ({ ...o, umapComponents: n }))}
                            disabled={!opts.useUMAP}
                            style={{
                              padding: "0.35rem 1rem", borderRadius: 6, cursor: "pointer",
                              fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
                              border: `1px solid ${opts.umapComponents === n ? ACCENT : "rgba(255,255,255,0.12)"}`,
                              background: opts.umapComponents === n ? `${ACCENT}18` : "rgba(0,0,0,0.2)",
                              color: opts.umapComponents === n ? ACCENT : "var(--text3)",
                            }}
                          >
                            {n}D
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>k neighbours</span>
                      <input
                        type="range" min="5" max="30" step="1"
                        value={opts.umapNeighbors}
                        onChange={e => setOpts(o => ({ ...o, umapNeighbors: parseInt(e.target.value) }))}
                        disabled={!opts.useUMAP}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {opts.umapNeighbors}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                      Browser approximation — not the full UMAP algorithm but captures similar non-linear structure.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Run ── */}
            <button
              onClick={handleRun}
              disabled={running}
              style={{
                padding: "0.75rem 2rem",
                background: ACCENT, border: "none", borderRadius: 8,
                color: "#000", fontWeight: 700, fontSize: "0.9rem",
                cursor: running ? "wait" : "pointer",
                boxShadow: `0 0 20px ${ACCENT}44`,
                alignSelf: "flex-start",
                opacity: running ? 0.6 : 1, transition: "opacity 0.15s",
              }}
            >
              {running ? "Running..." : "Run Feature Selection"}
            </button>

            {result && (
              <>
                {/* ── Stats ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                  {[
                    { label: "Input Features", value: String(result.features.length) },
                    { label: "Features Kept", value: String(result.keptCount), accent: true },
                    { label: "Features Dropped", value: String(result.droppedCount) },
                    {
                      label: "Reduction",
                      value: result.features.length > 0
                        ? `${Math.round((result.droppedCount / result.features.length) * 100)}%`
                        : "0%",
                    },
                  ].map(s => (
                    <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Rankings ── */}
                <div style={{ ...CARD }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>Feature Rankings</span>
                    <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                      bar = MI score
                      {result.kBestActive ? " · secondary bar = F/MI score" : ""}
                      {result.lassoActive ? " · orange = Lasso" : ""}
                      {result.ridgeActive ? " · purple = Ridge" : ""}
                      {result.treeActive ? " · green = Tree" : ""}
                      {" · high → low"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {result.features.map((f: FeatureScore) => (
                      <div key={f.name} style={{ opacity: f.kept ? 1 : 0.45 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: 9999, flexShrink: 0,
                            background: f.kept ? ACCENT : "#6b7280",
                          }} />
                          <span
                            title={f.name}
                            style={{
                              width: 180, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)",
                              flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {f.name}
                          </span>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            {/* MI bar */}
                            <div style={{ height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                              <div style={{
                                height: "100%", width: `${Math.max(f.score * 100, 2)}%`,
                                borderRadius: 9999,
                                background: f.kept ? ACCENT : "#6b7280",
                                boxShadow: f.kept ? `0 0 6px ${ACCENT}44` : "none",
                                transition: "width 0.4s",
                              }} />
                            </div>
                            {/* F/KBest bar */}
                            {result.kBestActive && f.fScore > 0 && (
                              <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                                <div style={{
                                  height: "100%", width: `${Math.max(f.fScore * 100, 2)}%`,
                                  borderRadius: 9999, background: "#a78bfa",
                                  transition: "width 0.4s",
                                }} />
                              </div>
                            )}
                            {/* Lasso bar */}
                            {result.lassoActive && f.lassoScore > 0 && (
                              <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                                <div style={{
                                  height: "100%", width: `${Math.max(f.lassoScore * 100, 2)}%`,
                                  borderRadius: 9999, background: "#f97316",
                                  transition: "width 0.4s",
                                }} />
                              </div>
                            )}
                            {/* Ridge bar */}
                            {result.ridgeActive && f.ridgeScore > 0 && (
                              <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                                <div style={{
                                  height: "100%", width: `${Math.max(f.ridgeScore * 100, 2)}%`,
                                  borderRadius: 9999, background: "#a78bfa",
                                  transition: "width 0.4s",
                                }} />
                              </div>
                            )}
                            {/* Tree bar */}
                            {result.treeActive && f.treeScore > 0 && (
                              <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                                <div style={{
                                  height: "100%", width: `${Math.max(f.treeScore * 100, 2)}%`,
                                  borderRadius: 9999, background: "#34d399",
                                  transition: "width 0.4s",
                                }} />
                              </div>
                            )}
                          </div>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 600,
                            color: f.kept ? ACCENT : "#6b7280",
                            width: 36, textAlign: "right", flexShrink: 0,
                          }}>
                            {f.score.toFixed(2)}
                          </span>
                          {!f.kept && (
                            <span style={{
                              fontSize: "0.64rem", color: "#6b7280",
                              flexShrink: 0, width: 160, textAlign: "right",
                            }}>
                              {f.reasons.join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Download selected ── */}
                <div style={{
                  ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: "1rem",
                }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>
                      Reduced Dataset Ready
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
                      {result.keptCount} selected feature{result.keptCount !== 1 ? "s" : ""}
                      {opts.targetCol ? " + target" : ""}
                      {categoricalCols.filter(c => c.name !== opts.targetCol).length > 0
                        ? ` + ${categoricalCols.filter(c => c.name !== opts.targetCol).length} categorical`
                        : ""}
                      {" "}· {rowCount.toLocaleString()} rows · CSV
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    style={{
                      padding: "0.6rem 1.4rem", background: ACCENT, border: "none", borderRadius: 8,
                      color: "#000", fontWeight: 700, fontSize: "0.84rem",
                      cursor: "pointer", boxShadow: `0 0 14px ${ACCENT}44`,
                    }}
                  >
                    Download CSV
                  </button>
                </div>

                {/* ── PCA result card ── */}
                {result.pcaResult != null && (() => {
                  const { components } = result.pcaResult;
                  const lastComp = components[components.length - 1];
                  return (
                    <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>PCA Components</span>
                        <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                          {components.length} components · {((lastComp?.cumulativeVariance ?? 0) * 100).toFixed(1)}% total variance explained
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                        {components.map((comp: PCAComponent) => (
                          <div key={comp.index} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: ACCENT, width: 36, flexShrink: 0 }}>
                              PC{comp.index}
                            </span>
                            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                              <div style={{
                                height: "100%", borderRadius: 9999,
                                width: `${Math.max(comp.varianceExplained * 100, 1)}%`,
                                background: ACCENT, opacity: 0.8,
                                transition: "width 0.4s",
                              }} />
                            </div>
                            <span style={{ fontSize: "0.73rem", color: "var(--text3)", width: 44, textAlign: "right", flexShrink: 0 }}>
                              {(comp.varianceExplained * 100).toFixed(1)}%
                            </span>
                            <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              Top: {comp.topLoadings[0]?.name} ({comp.topLoadings[0]?.loading > 0 ? "+" : ""}{comp.topLoadings[0]?.loading.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleDownloadPCA}
                        style={{
                          padding: "0.5rem 1.2rem", background: ACCENT, border: "none", borderRadius: 8,
                          color: "#000", fontWeight: 700, fontSize: "0.82rem",
                          cursor: "pointer", boxShadow: `0 0 12px ${ACCENT}44`,
                        }}
                      >
                        Download PCA CSV
                      </button>
                    </div>
                  );
                })()}

                {/* ── UMAP result card ── */}
                {result.umapResult != null && (
                  <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>UMAP Embedding</span>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "1rem", lineHeight: 1.55 }}>
                      {result.umapResult.nComponents}D spectral embedding · All rows have coordinates (kNN interpolation for rows beyond 400-row sample)
                    </div>
                    <button
                      onClick={handleDownloadUMAP}
                      style={{
                        padding: "0.5rem 1.2rem", background: ACCENT, border: "none", borderRadius: 8,
                        color: "#000", fontWeight: 700, fontSize: "0.82rem",
                        cursor: "pointer", boxShadow: `0 0 12px ${ACCENT}44`,
                      }}
                    >
                      Download UMAP CSV
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ToolsAIChat context={{
        tool: "Feature Selection",
        summary: cols.length > 0
          ? [
              `Dataset: ${rowCount} rows, ${cols.length} columns. Target: ${opts.targetCol || "none"}.`,
              `Numeric features: ${cols.filter(c => c.type === "numeric").map(c => c.name).join(", ")}.`,
              result
                ? `Selection result: kept ${result.keptCount} features, dropped ${result.droppedCount}. Kept: ${result.features.filter(f => f.kept).map(f => f.name).join(", ")}.`
                : "No selection run yet.",
            ].join(" ")
          : "No dataset loaded yet.",
      }} />
    </div>
  );
}