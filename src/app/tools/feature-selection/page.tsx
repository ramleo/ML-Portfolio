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
import FSReductionResultCards from "@/components/FSPanels/FSReductionResultCards";
import { useFSDownloads } from "@/hooks/useFSDownloads";
import type { ColInfo, SelectionOpts, SelectionResult } from "@/lib/fsAlgorithms";
import { parseCSV, analyzeColumns, runSelection } from "@/lib/fsAlgorithms";
import FSControls from "@/components/FSPanels/FSControls";
import HowItWorks from "@/components/FSPanels/FSHowItWorks";
import FSExcludePanel from "@/components/FSPanels/FSExcludePanel";
import FSUploadHero from "@/components/FSPanels/FSUploadHero";
import { useFSAISuggest } from "@/hooks/useFSAISuggest";

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

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | "variance" | "correlation" | "topk" | "rfe" | "selectkbest"
  | "forward" | "exhaustive" | "chisq" | "kendall"
  | "lasso" | "ridge" | "tree"
  | "pca" | "umap" | "fa" | "lda";

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
  usePCA: false, pcaComponents: 3, pcaKaiser: false,
  useUMAP: false, umapComponents: 2, umapNeighbors: 15,
  useFA: false, faFactors: 3,
  useLDA: false, ldaComponents: 2,
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
  const { aiLoading, aiError, handleAISuggest } = useFSAISuggest(cols, rowCount, opts, setOpts);
  const { handleDownload, handleDownloadPCA, handleDownloadUMAP, handleDownloadFA, handleDownloadLDA } = useFSDownloads(result, fileName);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [excludedCols, setExcludedCols] = useState<string[]>([]);
  const [excludeOpen, setExcludeOpen] = useState(false);

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
    { id: "fa",          label: "FA",         enabled: opts.useFA,          cat: "Reduction" },
    { id: "lda",         label: "LDA",        enabled: opts.useLDA,         cat: "Reduction" },
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
      setExcludeOpen(false);
      setExcludedCols([]);
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
      const filteredCols = excludedCols.length
        ? cols.filter(c => !excludedCols.includes(c.name))
        : cols;
      setResult(runSelection(filteredCols, opts));
      setRunning(false);
    }, 50);
  }, [cols, opts, excludedCols]);

  // Auto-re-run with 400 ms debounce when opts change and a result already exists
  useEffect(() => {
    if (!result || !cols.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRunning(true);
      setTimeout(() => {
        const filteredCols = excludedCols.length
          ? cols.filter(c => !excludedCols.includes(c.name))
          : cols;
        setResult(runSelection(filteredCols, opts));
        setRunning(false);
      }, 50);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, excludedCols]);

  const handleReset = useCallback(() => {
    setResult(null);
    setOpts(o => ({ ...DEFAULT_OPTS, targetCol: o.targetCol }));
  }, []);


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

        <FSUploadHero
          hasFile={hasFile}
          fileName={fileName}
          rowCount={rowCount}
          cols={cols}
          numericCols={numericCols}
          categoricalCols={categoricalCols}
          opts={opts}
          fileRef={fileRef}
          onFile={handleFile}
          onDrop={handleDrop}
        />

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

            <FSExcludePanel
              cols={cols}
              targetCol={opts.targetCol}
              excludedCols={excludedCols}
              excludeOpen={excludeOpen}
              setExcludeOpen={setExcludeOpen}
              setExcludedCols={setExcludedCols}
            />

            {/* Method config */}
            <RepulsionCard style={{ ...CARD }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                Selection Methods
              </div>

              <FSControls
                tabs={TABS}
                tabCategories={TAB_CATEGORIES}
                activeTab={activeTab}
                setActiveTab={(id) => setActiveTab(id as TabId)}
                result={result}
                running={running}
                aiLoading={aiLoading}
                aiError={aiError}
                hasFile={hasFile}
                onRun={handleRun}
                onAISuggest={handleAISuggest}
              />

              {/* How it works */}
              <div style={{ marginTop: "1.5rem" }}>
                <HowItWorks tabId={activeTab} />
              </div>

              {/* Tab panels */}
              <FilterTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} numericCols={numericCols} activeTab={activeTab} />
              <ScoreTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} activeTab={activeTab} />
              <WrapperTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} activeTab={activeTab} />
              <ReductionTabs opts={opts} setOpts={setOpts} candidateCount={candidateCount} cols={cols} activeTab={activeTab} />
            </RepulsionCard>

            {/* Results */}
            {result !== null && (
              <>
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
                <FSReductionResultCards
                  result={result}
                  opts={opts}
                  cols={cols}
                  rowCount={rowCount}
                  accent={ACCENT}
                  onDownloadFA={handleDownloadFA}
                  onDownloadLDA={handleDownloadLDA}
                />
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