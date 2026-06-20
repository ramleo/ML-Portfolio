"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import RepulsionCard from "@/components/RepulsionCard";
import FilterTabs from "@/components/FSPanels/FilterTabs";
import ScoreTabs from "@/components/FSPanels/ScoreTabs";
import WrapperTabs from "@/components/FSPanels/WrapperTabs";
import ReductionTabs from "@/components/FSPanels/ReductionTabs";
import FSResultCards from "@/components/FSPanels/FSResultCards";
import type { ColInfo, SelectionOpts, SelectionResult } from "@/lib/fsAlgorithms";
import { parseCSV, analyzeColumns, runSelection } from "@/lib/fsAlgorithms";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#fb923c";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

// ── Small local components ────────────────────────────────────────────────────

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

const HOW_IT_WORKS: Record<string, string> = {
  variance: "Computes the variance of each numeric feature across all rows. Variance = E[(X−μ)²]. Features with variance below the threshold are constant or near-constant and carry no signal — they are dropped first. E.g. if ‘zipcode’ has variance 0.0003 and your threshold is 0.01, it gets dropped — it barely changes across rows.",
  correlation: "Builds a Pearson r matrix between numeric features. When |r(A,B)| exceeds the threshold, the feature with lower mutual information vs. the target is discarded. This removes multicollinearity without losing predictive power. E.g. ‘height_cm’ and ‘height_in’ have r=0.99 — the one with lower MI vs. target is dropped.",
  topk: "After variance and correlation filtering, computes mutual information (MI ≈ −0.5 log(1−r²)) between each feature and the target, then keeps only the K highest-MI features. Fast hard-cutoff for very wide datasets. E.g. with K=5 and 20 candidates, only the 5 highest-MI features survive this step.",
  selectkbest: "Applies a univariate statistical test to each feature independently. f_regression: F(1,n−2) linear correlation. f_classif: one-way ANOVA. mi: MI approximation. Keeps the K features with the highest test score. E.g. f_regression on ‘income’ vs. ‘price’ computes F=142.3, ranking it above ‘age’ at F=8.1.",
  kendall: "Computes Kendall’s τ rank correlation. For every pair of observations (x_i, x_j), counts concordant pairs (same order in feature and target) minus discordant pairs, divided by total pairs. Robust to outliers and non-linear monotonic relationships. E.g. ‘education_level’ (ordinal) vs. ‘salary’ gets τ=0.61 — strong monotonic association without assuming linearity.",
  chisq: "Bins numeric features into quartiles, then applies a χ² test of independence against the (binned) target. χ² = Σ (O−E)²/E where O = observed count and E = expected under independence. Higher χ² = stronger dependence. E.g. ‘region’ binned × ‘churn’ category yields χ²=38.4 — far above the independence baseline.",
  rfe: "Iterative backward elimination. Each round scores remaining features by MI × (1 − 0.35 × avg_redundancy_with_others) and removes the lowest-scoring one. Continues until the target count is reached. Penalises weak AND redundant features differently from pure MI. E.g. round 1 removes ‘id’ (MI=0.01, high redundancy with ‘user_id’); round 2 removes ‘tenure_days’ once ‘tenure_months’ is kept.",
  lasso: "Coordinate descent with L1 regularisation. Soft-threshold update: w_j = sign(ρ_j) × max(|ρ_j| − α, 0) where ρ_j is the partial correlation residual. L1 penalty drives weak coefficients to exactly zero — built-in feature elimination. E.g. with α=0.05, ‘transaction_count’ weight shrinks to exactly 0 — Lasso has eliminated it.",
  ridge: "Gradient descent with L2 regularisation. Weight update: w_j ← w_j − lr × (∂MSE/∂w_j + 2αw_j). L2 shrinks all coefficients but never to zero — features ranked by final |w_j| and the weakest are pruned. E.g. ‘age’ and ‘age_squared’ both stay but their coefficients shrink from ±1.8 to ±0.3, and ‘age_squared’ ranks lower.",
  tree: "Random Forest-style importance. Builds N bootstrap trees; each split considers √p random features. Importance = cumulative weighted Gini (classification) or variance-reduction (regression) gain across all splits on each feature, averaged over trees. E.g. ‘glucose’ accumulates 0.38 average Gini gain across 50 trees — ranked #1 importance.",
  forward: "Greedy wrapper. Starts with an empty set S. Each round adds the feature f* = argmax_f MI(f, target) × (1 − 0.2 × avg_corr(f, S)). The diversity penalty (0.2 × redundancy) rewards diverse, complementary features over pure top-MI selection. E.g. step 1 picks ‘glucose’ (MI=0.71); step 2 picks ‘bmi’ (MI=0.54, low corr with glucose) over ‘insulin’ (MI=0.58, high corr with glucose).",
  exhaustive: "Enumerates all C(n,k) feature subsets of size k and scores each by avgMI(subset, target) − 0.3 × avgInterCorr(subset). Computationally infeasible for n > 15, so the algorithm automatically falls back to Forward Selection beyond that threshold. E.g. with 8 candidates and K=3, all C(8,3)=56 subsets are scored — {glucose, bmi, age} wins with score 0.61.",
  pca: "Standardises features (z-score), computes the covariance matrix, and extracts principal components via power iteration + deflation. Each PC is a linear combination of original features ordered by variance explained (eigenvalue / total variance). E.g. 10 correlated sensor features → PC1 explains 68% variance, PC2 explains 19% — 2 components replace 10 columns.",
  umap: "Builds a k-NN affinity graph using Gaussian kernel weights, normalises it into a symmetric Laplacian, then extracts the eigenvectors corresponding to the 2 or 3 smallest non-zero eigenvalues. This spectral embedding captures non-linear manifold structure. E.g. a dataset of 500 handwritten digits (784 features) embedded into 2D reveals 10 tight clusters — one per digit class.",
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

// ── Default opts ──────────────────────────────────────────────────────────────

const DEFAULT_OPTS: Omit<SelectionOpts, "targetCol"> = {
  useVariance: true, varianceThreshold: 0.01,
  useCorrelation: true, corrThreshold: 0.9,
  useTopK: false, topK: 10,
  useSelectKBest: false, selectKBestK: 10, kBestMethod: "f_regression",
  useKendall: false, kendallTopK: 10,
  useChiSq: false, chiSqTopK: 10,
  useRFE: false, rfeTargetK: 10,
  useLasso: false, lassoAlpha: 0.01, lassoTopK: 10,
  useRidge: false, ridgeAlpha: 1.0, ridgeTopK: 10,
  useTree: false, treeTopK: 10, treeNTrees: 50,
  useForward: false, forwardK: 10,
  useExhaustive: false, exhaustiveK: 5,
  usePCA: false, pcaComponents: 3,
  useUMAP: false, umapComponents: 2, umapNeighbors: 15,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeatureSelectionPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cols, setCols] = useState<ColInfo[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [opts, setOpts] = useState<SelectionOpts>({ targetCol: "", ...DEFAULT_OPTS });
  const [result, setResult] = useState<SelectionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("variance");
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const hasFile = cols.length > 0;
  const numericCols = cols.filter(c => c.type === "numeric");
  const categoricalCols = cols.filter(c => c.type === "categorical");
  const candidateCount = numericCols.filter(c => c.name !== opts.targetCol).length;
  const targetInfo = cols.find(c => c.name === opts.targetCol) ?? null;

  // ── Tab metadata ──────────────────────────────────────────────────────────

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

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  // Auto-re-run with 400 ms debounce when opts change and a result already exists
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

  const handleReset = useCallback(() => {
    setResult(null);
    setOpts(o => ({ ...DEFAULT_OPTS, targetCol: o.targetCol }));
  }, []);

  // AI Suggest — fixed: support both reply/content keys; strip markdown fences
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
      if (!res.ok) return;
      const data = await res.json() as { reply?: string; content?: string; error?: string };
      // Support both `reply` and `content` response shapes; strip markdown fences
      const raw = data.reply ?? data.content ?? "";
      const stripped = raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
      const match = stripped.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const patch = JSON.parse(match[0]) as Partial<SelectionOpts>;
          setOpts(o => ({ ...o, ...patch }));
        } catch { /* ignore parse errors */ }
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* Header */}
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

        {/* Hero */}
        <RepulsionCard style={{ ...CARD, borderColor: `${ACCENT}22` }}>
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
        </RepulsionCard>

        {/* Upload */}
        <RepulsionCard
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
                    {rowCount.toLocaleString()} rows &middot; {cols.length} columns ({numericCols.length} numeric, {categoricalCols.length} categorical)
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
        </RepulsionCard>

        {hasFile && (
          <>
            {/* Target */}
            <RepulsionCard style={{ ...CARD }}>
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
                <button onClick={handleReset} style={{ fontSize: "0.76rem", padding: "0.3rem 0.85rem", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text3)", cursor: "pointer", marginLeft: "auto" }}>
                  Reset Methods
                </button>
              </div>
            </RepulsionCard>

            {/* Method config */}
            <RepulsionCard style={{ ...CARD }}>
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

              {/* How it works */}
              <HowItWorks tabId={activeTab} />

              {/* Tab panels */}
              <FilterTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} numericCols={numericCols} activeTab={activeTab} />
              <ScoreTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} activeTab={activeTab} />
              <WrapperTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} activeTab={activeTab} />
              <ReductionTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} activeTab={activeTab} />
            </RepulsionCard>

            {/* Pipeline indicator */}
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
                        {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>&rarr;</span>}
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: cat?.color ?? ACCENT, padding: "1px 7px", borderRadius: 4, background: `${cat?.color ?? ACCENT}14`, border: `1px solid ${cat?.color ?? ACCENT}28` }}>
                          {t.label}
                        </span>
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* Run + AI Suggest row */}
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
              </div>
            </div>

            {/* Results */}
            {result !== null && (
              <FSResultCards
                result={result}
                cols={cols}
                opts={opts}
                numericCols={numericCols}
                categoricalCols={categoricalCols}
                fileName={fileName}
                rowCount={rowCount}
                accent={ACCENT}
                onDownload={handleDownload}
                onDownloadPCA={handleDownloadPCA}
                onDownloadUMAP={handleDownloadUMAP}
              />
            )}
          </>
        )}
      </div>

      <ToolsAIChat context={{
        tool: "Feature Selection",
        summary: cols.length > 0
          ? [
              `Dataset: ${rowCount} rows, ${cols.length} columns. Target: ${opts.targetCol || "none"}.`,
              `Numeric features: ${numericCols.map(c => c.name).join(", ")}.`,
              result
                ? `Selection result: kept ${result.keptCount} features, dropped ${result.droppedCount}. Kept: ${result.features.filter(f => f.kept).map(f => f.name).join(", ")}.`
                : "No selection run yet.",
            ].join(" ")
          : "No dataset loaded yet.",
      }} />
    </div>
  );
}