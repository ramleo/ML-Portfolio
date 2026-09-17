"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import AutoMLModal, { type TrainResult } from "@/components/modals/AutoMLModal";
import ConstellationBackground from "@/components/ConstellationBackground";
import CsvFromContextBanner from "@/components/CsvFromContextBanner";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import { StepIndicator } from "@/components/StepIndicator";
import type { Step as AutoMLStep } from "@/lib/automlUtils";
import { toolBackHref } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#3f8358";
const AUTOML_STEP_KEYS: AutoMLStep[] = ["upload", "config", "training", "results"];
const AUTOML_STEP_LABELS = ["Upload", "Config", "Training", "Results"];

function AutoMLPageInner() {
  const router     = useRouter();
  const { state, setState } = usePipeline();
  const triggerRef = useRef<((f: File) => void) | null>(null);

  const [contextLoading, setContextLoading] = useState(false);
  const [fileLoaded, setFileLoaded]         = useState(false);
  const [trainResult, setTrainResult]       = useState<TrainResult | null>(null);
  const [modalStep, setModalStep]           = useState<AutoMLStep>("upload");

  const handleReady = useCallback((trigger: (f: File) => void) => {
    triggerRef.current = trigger;
  }, []);

  // sessionStorage handoff from Preprocess page (auto-load, no banner needed)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("prep_handoff");
      if (!raw) return;
      sessionStorage.removeItem("prep_handoff");
      const { csv_b64, filename } = JSON.parse(raw) as { csv_b64: string; filename: string };
      const bytes = atob(csv_b64);
      const arr   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "text/csv" });
      const file = new File([blob], filename, { type: "text/csv" });
      triggerRef.current?.(file);
      setFileLoaded(true);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFromContext = useCallback(() => {
    const b64 = state.fsCsvB64 ?? state.feCsvB64 ?? state.preprocessedCsvB64 ?? state.csvB64;
    if (!b64 || !triggerRef.current) return;
    setContextLoading(true);
    try {
      const bytes = atob(b64);
      const arr   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob  = new Blob([arr], { type: "text/csv" });
      const label = state.fsCsvB64 ? "fs_output" : state.feCsvB64 ? "fe_output" : state.fileName ?? "pipeline_data";
      const file  = new File([blob], label.replace(/(\.[^.]+)?$/, ".csv"), { type: "text/csv" });
      triggerRef.current(file);
      setFileLoaded(true);
    } catch { /* ignore */ }
    finally { setContextLoading(false); }
  }, [state]);

  const handleBack = useCallback(() => router.push(toolBackHref("automl")), [router]);

  const ctxB64 = state.fsCsvB64 ?? state.feCsvB64 ?? state.preprocessedCsvB64 ?? state.csvB64;
  const stageLabel = state.fsCsvB64
    ? "FS-selected data"
    : state.feCsvB64
    ? "FE-transformed data"
    : state.preprocessedCsvB64
    ? "preprocessed data"
    : "uploaded data";

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="tool-header-row" style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <ToolBackNav toolId={"automl"} />
          <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>AutoML Pipeline</h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span data-wt="automl-steps"><StepIndicator labels={AUTOML_STEP_LABELS} currentIndex={AUTOML_STEP_KEYS.indexOf(modalStep)} accent={ACCENT} /></span>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div role="main" style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
        {ctxB64 && !fileLoaded && (
          <CsvFromContextBanner
            csvB64={ctxB64}
            stageLabel={stageLabel}
            accent={ACCENT}
            loading={contextLoading}
            onUseData={loadFromContext}
            onUploadDifferent={() => {
              setState(prev => ({ ...prev, fsCsvB64: null, feCsvB64: null, preprocessedCsvB64: null, csvB64: null }));
              setFileLoaded(false);
            }}
          />
        )}
        <AutoMLModal onClose={handleBack} isPage onReady={handleReady} onResultChange={(r) => setTrainResult(r)} onStepChange={setModalStep} />
      </div>

      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "AutoML Pipeline",
        summary: trainResult?.automl
          ? [
              `Tool: AutoML Pipeline | Winner: ${trainResult.automl.winner} | Task: ${trainResult.automl.task}`,
              trainResult.automl.winner_metrics ? `Metrics: ${Object.entries(trainResult.automl.winner_metrics).map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(4) : v}`).join(", ")}` : "",
              trainResult.automl.feature_importance?.length ? `Top features: ${trainResult.automl.feature_importance.slice(0, 10).map(f => `${f.feature}(${f.importance.toFixed(3)})`).join(", ")}` : "",
              `All model CV scores: ${trainResult.automl.cv_results.map(c => `${c.algorithm}=${c.score.toFixed(4)}`).join(", ")}`,
            ].filter(Boolean).join("\n")
          : "AutoML Pipeline. No training run yet — upload a CSV and start training first.",
      }} />
    </div>
  );
}

export default function AutoMLPage() {
  useToolTracking("automl");
  return (
    <PipelineProvider>
      <AutoMLPageInner />
    </PipelineProvider>
  );
}