"use client";
import { useToolTracking, track } from "@/hooks/useAnalytics";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import { analyzeCSV, preprocessCSV } from "@/lib/preprocessing";
import { parseCSVStream } from "@/lib/parseCSVStream";
import {
  AnalyzeResult, PrepResult, Step, PresetKey, PRESETS, computeQualityScore,
  STEP_KEYS, STEP_LABELS,
} from "@/lib/preprocessingAlgorithms";
import { StepIndicator } from "@/components/StepIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import { ConfigurePanel } from "@/components/PreprocessingPanels/ConfigurePanel";
import { ResultsPanel }   from "@/components/PreprocessingPanels/ResultsPanel";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";
import { buildPreprocessingContext } from "./preprocessingContext";
import { EV } from "@/lib/logEvents";

const ACCENT = "#377f8a";

function PreprocessingPageInner() {
  const { setState } = usePipeline();
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

  const analyze = useCallback((f: File) => {
    setAnalyzing(true); setError(null);
    parseCSVStream(f, (rows) => {
      try {
        const data = analyzeCSV(rows);
        setAnalyzed(data); setTarget(data.suggested_target); setStep("configure");
        track(EV.UPLOAD, { meta: { tool: "preprocessing", rows: data.rows, cols: data.columns.length } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed");
      } finally { setAnalyzing(false); }
    }, (err) => { setError(err); setAnalyzing(false); });
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setFile(f);
    // Store raw CSV in pipeline context for downstream pages
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      // FileReader result is "data:text/csv;base64,..." — strip the prefix
      const raw = b64.split(",")[1] ?? b64;
      setState(prev => ({ ...prev, csvB64: raw, fileName: f.name }));
    };
    reader.readAsDataURL(f);
    analyze(f);
  }, [analyze, setState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const handlePreprocess = useCallback(() => {
    if (!file || !analyzed) return;
    setStep("processing"); setError(null);
    parseCSVStream(file, (rows) => {
      setTimeout(() => {
        try {
          const data = preprocessCSV(rows, {
            remove_duplicates: removeDups, drop_columns: [...dropCols],
            target_column: target, mv_num: mvNum, mv_cat: mvCat,
            remove_outliers: removeOutliers, fix_skewness: fixSkewness,
            encode_method: encodeMethod, standardize,
          }, file.name);
          setResult(data); setStep("results");
          track(EV.RUN_SUCCESS, { meta: { tool: "preprocessing", rows_before: data.rows_before, rows_after: data.rows_after, preset: activePreset } });
          // Store preprocessed CSV in context for FE/FS/AutoML pages
          const csvText = data.csvText;
          try {
            const b64 = btoa(unescape(encodeURIComponent(csvText)));
            setState(prev => ({
              ...prev,
              preprocessedCsvB64: b64,
              columns: data.columns.map(c => c.name),
            }));
          } catch { /* ignore encode errors */ }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Preprocessing failed");
          setStep("configure");
        }
      }, 50);
    }, (err) => { setError(err); setStep("configure"); });
  }, [file, analyzed, target, dropCols, mvNum, mvCat, removeDups, removeOutliers, fixSkewness, encodeMethod, standardize, activePreset]);

  const downloadCSV = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.preprocessed_filename; a.click(); URL.revokeObjectURL(url);
    track(EV.EXPORT, { meta: { tool: "preprocessing", format: "csv" } });
  }, [result]);

  const passToAutoML = useCallback(() => {
    if (!result) return;
    try {
      const csv_b64 = btoa(encodeURIComponent(result.csvText).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))));
      sessionStorage.setItem("prep_handoff", JSON.stringify({ csv_b64, filename: result.preprocessed_filename }));
    } catch {}
    track(EV.NAV_CLICK, { meta: { tool: "preprocessing", target: "automl" } });
    router.push("/tools/automl");
  }, [result, router]);

  const reset = useCallback(() => {
    setStep("upload"); setFile(null); setAnalyzed(null); setResult(null); setError(null);
    setDropCols(new Set()); setTarget(""); setMvNum("mean"); setMvCat("most_frequent");
    setRemoveDups(true); setRemoveOutliers(false); setFixSkewness(false);
    setEncodeMethod("none"); setStandardize(false); setActivePreset("custom");
  }, []);

  // Lock body scroll in configure mode so panels scroll independently
  useEffect(() => {
    if (step === "configure") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  const targetEncodingWarn = encodeMethod === "target" && !target;

  const beforeScore = analyzed ? computeQualityScore(analyzed.rows, analyzed.total_missing, analyzed.columns) : 0;
  const afterScore  = result   ? computeQualityScore(result.rows_after, result.total_missing, result.columns) : 0;

  return (
    <div style={{
      ...(step === "configure"
        ? { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }
        : { minHeight: "100vh" }),
      color: "var(--text)",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ConstellationBackground />

      {/* Page header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="tool-header-row" style={{ maxWidth: 1140, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <ToolBackNav toolId={"preprocessing"} />
            <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>ML Capabilities</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Data Preprocessing</span>
              <span style={{ fontSize: "0.7rem", color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 9999, padding: "1px 8px" }}>runs in browser</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div data-wt="prep-steps">
              <StepIndicator labels={STEP_LABELS} currentIndex={STEP_KEYS.indexOf(step)} accent={ACCENT} />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div role="main" style={{
        maxWidth: 1140, margin: "0 auto", width: "100%",
        ...(step === "configure"
          ? { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "1.25rem 1.5rem 0", minHeight: 0 }
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
              data-wt="prep-upload"
              className="subtle-card"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? ACCENT : "var(--border2)"}`,
                borderRadius: 16, padding: "3.5rem 2rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem",
                cursor: "pointer",
                background: dragging ? `${ACCENT}08` : "var(--bg-glass)",
                backdropFilter: "blur(14px)",
                ["--acc-glow" as string]: `${ACCENT}14`,
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
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.25rem" }}>Supports any labeled CSV file</div>
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
            <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text3)", textAlign: "center" }}>
              All rows processed in-browser · large files (&gt;5,000 rows) may be slow
            </div>
          </div>
        )}

        {/* ── Configure ── */}
        {step === "configure" && analyzed && (
          <ConfigurePanel
            analyzed={analyzed}
            target={target} setTarget={setTarget}
            dropCols={dropCols} setDropCols={setDropCols}
            mvNum={mvNum} setMvNum={setMvNum}
            mvCat={mvCat} setMvCat={setMvCat}
            removeDups={removeDups} setRemoveDups={setRemoveDups}
            removeOutliers={removeOutliers} setRemoveOutliers={setRemoveOutliers}
            fixSkewness={fixSkewness} setFixSkewness={setFixSkewness}
            encodeMethod={encodeMethod} setEncodeMethod={setEncodeMethod}
            standardize={standardize} setStandardize={setStandardize}
            activePreset={activePreset} setActivePreset={setActivePreset}
            applyPreset={applyPreset}
            wrapSetter={wrapSetter}
            error={error}
            onReset={reset}
            onPreprocess={handlePreprocess}
            targetEncodingWarn={targetEncodingWarn}
          />
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
          <div data-wt="prep-results">
          <ResultsPanel
            result={result}
            analyzed={analyzed}
            beforeScore={beforeScore}
            afterScore={afterScore}
            onDownload={downloadCSV}
            onPassToAutoML={passToAutoML}
            onBackToConfigure={() => setStep("configure")}
            onReset={reset}
          />
          </div>
        )}
      </div>

      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Data Preprocessing",
        summary: buildPreprocessingContext(analyzed, result),
      }} />
    </div>
  );
}

export default function PreprocessingPage() {
  useToolTracking("preprocessing");
  return (
    <PipelineProvider>
      <PreprocessingPageInner />
    </PipelineProvider>
  );
}