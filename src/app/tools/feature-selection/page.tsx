"use client";
import { useToolTracking, track } from "@/hooks/useAnalytics";

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
import { analyzeColumns } from "@/lib/fsAlgorithms";
import { parseCSVStreamFS } from "@/lib/parseCSVStream";
import FSControls from "@/components/FSPanels/FSControls";
import HowItWorks from "@/components/FSPanels/FSHowItWorks";
import FSExcludePanel from "@/components/FSPanels/FSExcludePanel";
import FSUploadHero from "@/components/FSPanels/FSUploadHero";
import { useFSAISuggest } from "@/hooks/useFSAISuggest";
import FSPageHeader from "@/components/FSPanels/FSPageHeader";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import CsvFromContextBanner from "@/components/CsvFromContextBanner";
import { buildTabs, TAB_CATEGORIES, type TabId } from "@/components/FSPanels/fsTabs";
import { toolBackHref } from "@/lib/toolNav";

import { DEFAULT_OPTS } from "./defaultOpts";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#a9652d";

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

// ── Inner Page ────────────────────────────────────────────────────────────────

function FeatureSelectionPageInner() {
  const router = useRouter();
  const { state, setState } = usePipeline();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cols, setCols] = useState<ColInfo[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [contextLoading, setContextLoading] = useState(false);
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
  const runnerStep = !hasFile ? 1 : result ? 3 : 2;
  const numericCols = cols.filter(c => c.type === "numeric");
  const categoricalCols = cols.filter(c => c.type === "categorical");
  const candidateCount = numericCols.filter(c => c.name !== opts.targetCol).length;
  const targetInfo = cols.find(c => c.name === opts.targetCol) ?? null;

  // ── Tab metadata ──────────────────────────────────────────────────────────

  const TABS = buildTabs(opts);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    parseCSVStreamFS(file, ({ headers, rows }) => {
      if (!headers.length) return;
      const analyzed = analyzeColumns(headers, rows);
      setCols(analyzed);
      setFileName(file.name);
      setRowCount(rows.length);
      setContextLoading(false);
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
      track("tool_open", { meta: { tool: "feature-selection", action: "upload_csv", rows: rows.length, cols: analyzed.length } });
    }, () => {});
  }, []);

  const loadFromContext = useCallback(() => {
    const b64 = state.feCsvB64 ?? state.preprocessedCsvB64;
    if (!b64) return;
    try {
      setContextLoading(true);
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "text/csv" });
      const name = (state.fileName ?? "from_context.csv").replace(/(\.[^.]+)?$/, ".csv");
      const file = new File([blob], name, { type: "text/csv" });
      handleFile(file);
    } catch { setContextLoading(false); }
  }, [state.feCsvB64, state.preprocessedCsvB64, state.fileName, handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }, [handleFile]);

  const runSelectionWorker = useCallback((filteredCols: ColInfo[], selOpts: SelectionOpts) => {
    const worker = new Worker(new URL("../../../workers/fsSelectionWorker.ts", import.meta.url));
    worker.onmessage = (e) => {
      const { type, payload, message } = e.data;
      if (type === "result") {
        setResult(payload as SelectionResult);
        try {
          const sr = payload as SelectionResult;
          const kept = sr.features
            .filter((f: { name: string; kept: boolean }) => f.kept)
            .map((f: { name: string; kept: boolean }) => f.name);
          const fsCsvB64 = btoa(unescape(encodeURIComponent(sr.csvText)));
          setState(prev => ({ ...prev, selectedFeatures: kept, fsCsvB64 }));
        } catch { /* ignore */ }
      } else if (type === "error") console.error("FS worker error:", message);
      setRunning(false);
      worker.terminate();
    };
    worker.onerror = (err) => { console.error("FS worker error:", err.message); setRunning(false); worker.terminate(); };
    worker.postMessage({ cols: filteredCols, opts: selOpts });
  }, [setState]);

  const handleRun = useCallback(() => {
    if (!cols.length || typeof window === "undefined") return;
    setRunning(true);
    track("query_run", { meta: { tool: "feature-selection", action: "run_selection", cols: cols.length } });
    runSelectionWorker(excludedCols.length ? cols.filter(c => !excludedCols.includes(c.name)) : cols, opts);
  }, [cols, opts, excludedCols, runSelectionWorker]);

  // Auto-re-run with 400 ms debounce when opts change and a result already exists
  useEffect(() => {
    if (!result || !cols.length || typeof window === "undefined") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setRunning(true);
      runSelectionWorker(excludedCols.length ? cols.filter(c => !excludedCols.includes(c.name)) : cols, opts);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, excludedCols]);

  useEffect(() => {
    if (!result) return;
    track("query_run", { meta: { tool: "feature-selection", action: "selection_complete", kept: result.keptCount, dropped: result.droppedCount } });
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setOpts(o => ({ ...DEFAULT_OPTS, targetCol: o.targetCol }));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      <FSPageHeader accent={ACCENT} onHome={() => router.push(toolBackHref("feature-selection"))} currentStep={runnerStep} />

      <div style={{
        maxWidth: 960, margin: "0 auto",
        padding: "2.5rem 1.5rem 5rem",
        display: "flex", flexDirection: "column", gap: "1.5rem",
      }}>

        {(state.feCsvB64 ?? state.preprocessedCsvB64) && cols.length === 0 && (
          <CsvFromContextBanner
            csvB64={(state.feCsvB64 ?? state.preprocessedCsvB64)!}
            stageLabel={state.feCsvB64 ? "FE-transformed data" : "preprocessed data"}
            accent="#fb923c"
            onUseData={loadFromContext}
            loading={contextLoading}
            onUploadDifferent={() => {
              setState(prev => ({ ...prev, feCsvB64: null, preprocessedCsvB64: null }));
              setContextLoading(false);
            }}
          />
        )}

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
            <RepulsionCard style={{ ...CARD }} data-wt="fs-target">
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
                    background: "var(--border)", border: "1px solid var(--border2)",
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
                <button onClick={handleReset} style={{ fontSize: "0.76rem", padding: "0.3rem 0.85rem", borderRadius: 6, background: "var(--border)", border: "1px solid var(--border2)", color: "var(--text3)", cursor: "pointer", marginLeft: "auto" }}>
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
            <RepulsionCard style={{ ...CARD }} data-wt="fs-methods">
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
        accent: ACCENT,
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

// ── Wrapper ───────────────────────────────────────────────────────────────────

export default function FeatureSelectionPage() {
  useToolTracking("feature-selection");
  return (
    <PipelineProvider>
      <FeatureSelectionPageInner />
    </PipelineProvider>
  );
}