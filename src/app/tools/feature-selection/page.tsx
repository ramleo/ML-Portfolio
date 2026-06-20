"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import { ScoreComparisonChart, PCAScreeChart } from "@/components/FSCharts";
import UMAPScatter from "@/components/UMAPScatter";
import type { ColInfo, SelectionOpts, FeatureScore, PCAComponent, SelectionResult, KBestMethod } from "@/lib/fsAlgorithms";
import { parseCSV, analyzeColumns, runSelection } from "@/lib/fsAlgorithms";
import MouseTiltCard from "@/components/MouseTiltCard";

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

// ── HowItWorks ────────────────────────────────────────────────────────────────

const HOW_IT_WORKS: Record<string, string> = {
  variance: "Computes the variance of each numeric feature across all rows. Variance = E[(X−μ)²]. Features with variance below the threshold are constant or near-constant and carry no signal — they are dropped first.",
  correlation: "Builds a Pearson r matrix between numeric features. When |r(A,B)| exceeds the threshold, the feature with lower mutual information vs. the target is discarded. This removes multicollinearity without losing predictive power.",
  topk: "After variance and correlation filtering, computes mutual information (MI ≈ −0.5 log(1−r²)) between each feature and the target, then keeps only the K highest-MI features. Fast hard-cutoff for very wide datasets.",
  selectkbest: "Applies a univariate statistical test to each feature independently. f_regression: F(1,n−2) linear correlation. f_classif: one-way ANOVA. mi: MI approximation. Keeps the K features with the highest test score.",
  kendall: "Computes Kendall's τ rank correlation. For every pair of observations (x_i, x_j), counts concordant pairs (same order in feature and target) minus discordant pairs, divided by total pairs. Robust to outliers and non-linear monotonic relationships.",
  chisq: "Bins numeric features into quartiles, then applies a χ² test of independence against the (binned) target. χ² = Σ (O−E)²/E where O = observed count and E = expected under independence. Higher χ² = stronger dependence.",
  rfe: "Iterative backward elimination. Each round scores remaining features by MI × (1 − 0.35 × avg_redundancy_with_others) and removes the lowest-scoring one. Continues until the target count is reached. Penalises weak AND redundant features differently from pure MI.",
  lasso: "Coordinate descent with L1 regularisation. Soft-threshold update: w_j = sign(ρ_j) × max(|ρ_j| − α, 0) where ρ_j is the partial correlation residual. L1 penalty drives weak coefficients to exactly zero — built-in feature elimination.",
  ridge: "Gradient descent with L2 regularisation. Weight update: w_j ← w_j − lr × (∂MSE/∂w_j + 2αw_j). L2 shrinks all coefficients but never to zero — features ranked by final |w_j| and the weakest are pruned.",
  tree: "Random Forest-style importance. Builds N bootstrap trees; each split considers √p random features. Importance = cumulative weighted Gini (classification) or variance-reduction (regression) gain across all splits on each feature, averaged over trees.",
  forward: "Greedy wrapper. Starts with an empty set S. Each round adds the feature f* = argmax_f MI(f, target) × (1 − 0.2 × avg_corr(f, S)). The diversity penalty (0.2 × redundancy) rewards diverse, complementary features over pure top-MI selection.",
  exhaustive: "Enumerates all C(n,k) feature subsets of size k and scores each by avgMI(subset, target) − 0.3 × avgInterCorr(subset). Computationally infeasible for n > 15, so the algorithm automatically falls back to Forward Selection beyond that threshold.",
  pca: "Standardises features (z-score), computes the covariance matrix, and extracts principal components via power iteration + deflation. Each PC is a linear combination of original features ordered by variance explained (eigenvalue / total variance).",
  umap: "Builds a k-NN affinity graph using Gaussian kernel weights, normalises it into a symmetric Laplacian, then extracts the eigenvectors corresponding to the 2 or 3 smallest non-zero eigenvalues. This spectral embedding captures non-linear manifold structure.",
};

function HowItWorks({ tabId }: { tabId: string }) {
  const [open, setOpen] = useState(false);
  const text = HOW_IT_WORKS[tabId];
  if (!text) return null;
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: "0.72rem", fontWeight: 600, color: "var(--text3)",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3z" />
        </svg>
        How it works
      </button>
      {open && (
        <div style={{
          marginTop: "0.45rem", padding: "0.65rem 0.9rem",
          background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${ACCENT}`,
          borderRadius: "0 6px 6px 0", fontSize: "0.74rem",
          color: "var(--text3)", lineHeight: 1.65,
        }}>
          {text}
        </div>
      )}
    </div>
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
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-re-run with 400ms debounce when opts change and a result already exists
  useEffect(() => {
    if (!result || !cols.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRunning(true);
      setTimeout(() => {
        setResult(runSelection(cols, opts));
        setRunning(false);
      }, 50);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts]);

  const handleAISuggest = useCallback(async () => {
    if (!cols.length) return;
    setAiLoading(true);
    try {
      const numCols = cols.filter(c => c.type === "numeric");
      const catCols = cols.filter(c => c.type === "categorical");
      const targetType = cols.find(c => c.name === opts.targetCol)?.type ?? "none";
      const stats = {
        rowCount,
        colCount: cols.length,
        numericCount: numCols.length,
        categoricalCount: catCols.length,
        targetCol: opts.targetCol,
        targetType,
        sampleFeatures: numCols.slice(0, 8).map(c => {
          const finiteNums = c.nums.filter(isFinite);
          const sorted = [...finiteNums].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
          const skew = (c.mean - median) / (Math.sqrt(c.variance) || 1);
          return { name: c.name, variance: c.variance, nunique: c.nunique, missing: c.missing, skew };
        }),
      };
      const prompt = `Given this dataset (${rowCount} rows, ${numCols.length} numeric features, target="${opts.targetCol || "none"}", target type="${targetType}"), suggest which feature selection methods to enable and their settings. Respond with ONLY a valid JSON object — no explanation, no markdown fences — containing only the SelectionOpts boolean/numeric fields you recommend changing. Available boolean fields: useVariance, useCorrelation, useTopK, useSelectKBest, useKendall, useChiSq, useRFE, useLasso, useRidge, useTree, useForward, usePCA, useUMAP. Example: {"useLasso":true,"lassoAlpha":0.05,"useTree":true,"treeTopK":8}`;
      const res = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          toolContext: JSON.stringify(stats),
          provider: "gemini",
        }),
      });
      if (res.ok) {
        const data = await res.json() as { reply?: string; error?: string };
        const raw = data.reply ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const patch = JSON.parse(match[0]) as Partial<SelectionOpts>;
            setOpts(o => ({ ...o, ...patch }));
          } catch { /* ignore parse errors */ }
        }
      }
    } catch { /* ignore network errors */ } finally {
      setAiLoading(false);
    }
  }, [cols, rowCount, opts.targetCol]);

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

  const TABS: { id: TabId; label: string; enabled: boolean; cat: string }[] = [
    { id: "variance",    label: "Variance",   enabled: opts.useVariance,    cat: "Filter" },
    { id: "correlation", label: "Corr",       enabled: opts.useCorrelation, cat: "Filter" },
    { id: "topk",        label: "Top-K",      enabled: opts.useTopK,        cat: "Filter" },
    { id: "selectkbest", label: "K Best",     enabled: opts.useSelectKBest, cat: "Score" },
    { id: "kendall",     label: "Kendall τ",  enabled: opts.useKendall,     cat: "Score" },
    { id: "chisq",       label: "Chi-sq",     enabled: opts.useChiSq,       cat: "Score" },
    { id: "rfe",         label: "RFE",        enabled: opts.useRFE,         cat: "Wrapper" },
    { id: "lasso",       label: "Lasso",      enabled: opts.useLasso,       cat: "Wrapper" },
    { id: "ridge",       label: "Ridge",      enabled: opts.useRidge,       cat: "Wrapper" },
    { id: "tree",        label: "Tree",       enabled: opts.useTree,        cat: "Wrapper" },
    { id: "forward",     label: "Forward",    enabled: opts.useForward,     cat: "Wrapper" },
    { id: "exhaustive",  label: "Exhaustive", enabled: opts.useExhaustive,  cat: "Wrapper" },
    { id: "pca",         label: "PCA",        enabled: opts.usePCA,         cat: "Reduction" },
    { id: "umap",        label: "UMAP",       enabled: opts.useUMAP,        cat: "Reduction" },
  ];

  const TAB_CATEGORIES = [
    { label: "Filter",    color: "#60a5fa" },
    { label: "Score",     color: "#a78bfa" },
    { label: "Wrapper",   color: "#34d399" },
    { label: "Reduction", color: "#f472b6" },
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
        <MouseTiltCard style={{ ...CARD, borderColor: `${ACCENT}22` }}>
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
        </MouseTiltCard>

        {/* ── Upload ── */}
        <MouseTiltCard
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
        </MouseTiltCard>

        {hasFile && (
          <>
            {/* ── Target ── */}
            <MouseTiltCard style={{ ...CARD }}>
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
            </MouseTiltCard>

            {/* ── Method config ── */}
            <MouseTiltCard style={{ ...CARD }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                Selection Methods
              </div>

              {/* Grouped tab bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.25rem" }}>
                {TAB_CATEGORIES.map(cat => {
                  const catTabs = TABS.filter(t => t.cat === cat.label);
                  return (
                    <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 700, color: cat.color,
                        textTransform: "uppercase", letterSpacing: "0.09em",
                        width: 58, flexShrink: 0, textAlign: "right",
                      }}>{cat.label}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "0.2rem", borderLeft: `2px solid ${cat.color}30` }}>
                        {catTabs.map(tab => {
                          const active = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              style={{
                                padding: "0.32rem 0.6rem", border: "none", borderRadius: 5, cursor: "pointer",
                                fontSize: "0.74rem", fontWeight: 600, transition: "all 0.15s",
                                background: active ? cat.color : "transparent",
                                color: active ? "#000" : tab.enabled ? "var(--text)" : "var(--text3)",
                                boxShadow: active ? `0 0 8px ${cat.color}44` : "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tab.label}
                              {tab.enabled && !active && (
                                <span style={{ marginLeft: "0.3rem", display: "inline-block", width: 5, height: 5, borderRadius: 9999, background: cat.color, verticalAlign: "middle", opacity: 0.8 }} />
                              )}
                              {result && (
                                <span style={{ fontSize: "0.58rem", background: "rgba(0,0,0,0.3)", borderRadius: 9999, padding: "1px 5px", marginLeft: "0.25rem", color: active ? "#000" : "var(--text3)" }}>
                                  {result.keptCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* How it works — auto-updates per active tab */}
              <HowItWorks tabId={activeTab} />

              {/* ── Variance tab ── */}
              {activeTab === "variance" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useVariance}
                      onChange={e => setOpts(o => ({ ...o, useVariance: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable variance threshold</span>
                  </label>
                  <div style={{ opacity: opts.useVariance ? 1 : 0.4, transition: "opacity 0.15s" }}>
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
            </MouseTiltCard>

            {/* ── Pipeline indicator ── */}
            {(() => {
              const active = TABS.filter(t => t.enabled);
              if (active.length === 0) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap", padding: "0.6rem 0.9rem", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginRight: "0.25rem" }}>Pipeline</span>
                  {active.map((t, i) => {
                    const cat = TAB_CATEGORIES.find(c => c.label === t.cat);
                    return (
                      <span key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>→</span>}
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: cat?.color ?? ACCENT, padding: "1px 7px", borderRadius: 4, background: `${cat?.color ?? ACCENT}14`, border: `1px solid ${cat?.color ?? ACCENT}28` }}>
                          {t.label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Run + AI Suggest row ── */}
            <div style={{ position: "sticky", bottom: "1.5rem", zIndex: 20, alignSelf: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={handleRun}
                disabled={running}
                style={{
                  padding: "0.75rem 2rem",
                  background: ACCENT, border: "none", borderRadius: 8,
                  color: "#000", fontWeight: 700, fontSize: "0.9rem",
                  cursor: running ? "wait" : "pointer",
                  boxShadow: `0 0 20px ${ACCENT}44`,
                  opacity: running ? 0.6 : 1, transition: "opacity 0.15s",
                }}
              >
                {running ? "Running..." : "Run Feature Selection"}
              </button>
              {hasFile && (
                <button
                  onClick={handleAISuggest}
                  disabled={aiLoading || !hasFile}
                  title="Let AI analyze your dataset and suggest which methods to enable"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.45rem",
                    padding: "0.75rem 1.25rem",
                    background: "rgba(139,92,246,0.12)",
                    border: "1px solid rgba(139,92,246,0.35)",
                    borderRadius: 8,
                    color: aiLoading ? "var(--text3)" : "#a78bfa",
                    fontWeight: 600, fontSize: "0.84rem",
                    cursor: aiLoading ? "wait" : "pointer",
                    transition: "all 0.15s",
                    opacity: aiLoading ? 0.6 : 1,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {aiLoading ? "Analyzing..." : "AI Suggest Methods"}
                </button>
              )}
            </div>
            </div>

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
                    <MouseTiltCard key={s.label} style={{ ...CARD, textAlign: "center" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
                    </MouseTiltCard>
                  ))}
                </div>

                {/* ── Rankings ── */}
                <MouseTiltCard style={{ ...CARD }}>
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
                    {result.features.map((f: FeatureScore) => {
                      const colVariance = cols.find(c => c.name === f.name)?.variance;
                      return (
                        <div key={f.name} style={{ opacity: f.kept ? 1 : 0.45, background: f.kept ? "rgba(251,146,60,0.04)" : undefined, borderRadius: 6, padding: "0.15rem 0.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {/* kept/dropped indicator */}
                            {f.kept ? (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                <polyline points="2,6 5,9 10,3" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, display: "block" }}>
                                <line x1="3" y1="3" x2="9" y2="9" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                                <line x1="9" y1="3" x2="3" y2="9" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                              </svg>
                            )}
                            <span
                              title={f.name}
                              style={{
                                width: 200, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)",
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
                            {colVariance !== undefined && (
                              <span style={{
                                fontSize: "0.67rem", color: "var(--text3)",
                                width: 60, textAlign: "right", flexShrink: 0,
                              }}>
                                σ²={colVariance < 0.01 ? colVariance.toExponential(1) : colVariance.toFixed(3)}
                              </span>
                            )}
                            {!f.kept && (
                              <span style={{
                                fontSize: "0.64rem", color: "#6b7280",
                                flexShrink: 0, width: 140, textAlign: "right",
                              }}>
                                {f.reasons.join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </MouseTiltCard>

                {/* ── Method agreement ── */}
                {(result.kBestActive || result.lassoActive || result.ridgeActive || result.treeActive) && (() => {
                  const keptFeatures = result.features.filter(f => f.kept).slice(0, 15);
                  const methods = [
                    { key: "mi",    label: "MI",     score: (f: FeatureScore) => f.score > 0 },
                    { key: "fk",    label: "F/KBest", score: (f: FeatureScore) => result.kBestActive && f.fScore > 0 },
                    { key: "lasso", label: "Lasso",  score: (f: FeatureScore) => result.lassoActive && f.lassoScore > 0 },
                    { key: "ridge", label: "Ridge",  score: (f: FeatureScore) => result.ridgeActive && f.ridgeScore > 0 },
                    { key: "tree",  label: "Tree",   score: (f: FeatureScore) => result.treeActive && f.treeScore > 0 },
                  ];
                  const activeMethods = methods.filter(m => m.key === "mi" || (m.key === "fk" && result.kBestActive) || (m.key === "lasso" && result.lassoActive) || (m.key === "ridge" && result.ridgeActive) || (m.key === "tree" && result.treeActive));
                  return (
                    <MouseTiltCard style={{ ...CARD }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem" }}>
                        Method Agreement
                        <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                          which scoring methods agree on kept features
                        </span>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 160, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Feature</th>
                              {activeMethods.map(m => (
                                <th key={m.key} style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 60, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{m.label}</th>
                              ))}
                              <th style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 80, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Consensus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keptFeatures.map((f, i) => {
                              const agreed = activeMethods.filter(m => m.score(f)).length;
                              return (
                                <tr key={f.name} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : undefined }}>
                                  <td style={{ padding: "0.35rem 0.5rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</td>
                                  {activeMethods.map(m => (
                                    <td key={m.key} style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                                      {m.score(f)
                                        ? <span style={{ color: "#4ade80", fontWeight: 700 }}>✓</span>
                                        : <span style={{ color: "#6b7280" }}>×</span>}
                                    </td>
                                  ))}
                                  <td style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: agreed === activeMethods.length ? ACCENT : "var(--text3)", fontWeight: agreed === activeMethods.length ? 700 : 400 }}>
                                    {agreed}/{activeMethods.length}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </MouseTiltCard>
                  );
                })()}

                {/* ── Score comparison chart ── */}
                {result.features.length > 0 && (
                  <MouseTiltCard style={{ ...CARD }}>
                    <ScoreComparisonChart features={result.features} result={result} accent={ACCENT} />
                  </MouseTiltCard>
                )}

                {/* ── Correlation heatmap ── */}
                {numericCols.filter(c => c.name !== opts.targetCol).length >= 2 && (
                  <MouseTiltCard style={{ ...CARD }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem" }}>
                      Correlation Heatmap
                    </div>
                    <CorrelationHeatmap cols={numericCols.filter(c => c.name !== opts.targetCol)} accent={ACCENT} />
                  </MouseTiltCard>
                )}

                {/* ── Download selected ── */}
                <MouseTiltCard style={{
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
                </MouseTiltCard>

                {/* ── PCA result card ── */}
                {result.pcaResult != null && (() => {
                  const { components } = result.pcaResult;
                  const lastComp = components[components.length - 1];
                  return (
                    <MouseTiltCard style={{ ...CARD, borderColor: `${ACCENT}22` }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>PCA Components</span>
                        <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                          {components.length} components · {((lastComp?.cumulativeVariance ?? 0) * 100).toFixed(1)}% total variance explained
                        </span>
                      </div>
                      <PCAScreeChart components={components} accent={ACCENT} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", marginTop: "1rem" }}>
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
                    </MouseTiltCard>
                  );
                })()}

                {/* ── UMAP result card ── */}
                {result.umapResult != null && (
                  <MouseTiltCard style={{ ...CARD, borderColor: `${ACCENT}22` }}>
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>UMAP Embedding</span>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "1rem", lineHeight: 1.55 }}>
                      {result.umapResult.nComponents}D spectral embedding · All rows have coordinates (kNN interpolation for rows beyond 400-row sample)
                    </div>
                    <UMAPScatter
                      umapResult={result.umapResult}
                      accent={ACCENT}
                      labelValues={opts.targetCol
                        ? cols.find(c => c.name === opts.targetCol)?.rawVals.map(String)
                        : undefined}
                    />
                    <div style={{ marginTop: "1rem" }} />
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
                  </MouseTiltCard>
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