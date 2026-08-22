"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import CsvFromContextBanner from "@/components/CsvFromContextBanner";
import OptunaRunner from "./OptunaRunner";
import { StepIndicator } from "@/components/StepIndicator";
import ThemeToggle from "@/components/ThemeToggle";

const ACCENT = "#a78bfa";
const OPTUNA_STEP_LABELS = ["Upload", "Configure", "Results"];

function OptunaPageInner() {
  const router = useRouter();
  const { state, setState } = usePipeline();
  const triggerRef = useRef<((f: File) => void) | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [trainResult, setTrainResult] = useState<{ winner: string; cv_results: { name: string; score: number }[]; winner_metrics: Record<string, number | string>; feature_importance: { feature: string; importance: number }[]; best_params?: Record<string, number | string> } | null>(null);
  const [runnerStep, setRunnerStep] = useState(1);

  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  const handleReady = useCallback((trigger: (f: File) => void) => {
    triggerRef.current = trigger;
  }, []);

  const loadFromContext = useCallback(() => {
    const b64 = state.fsCsvB64 ?? state.feCsvB64 ?? state.preprocessedCsvB64 ?? state.csvB64;
    if (!b64 || !triggerRef.current) return;
    setContextLoading(true);
    try {
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "text/csv" });
      const label = state.fsCsvB64 ? "fs_output" : state.feCsvB64 ? "fe_output" : state.fileName ?? "pipeline_data";
      const file = new File([blob], label.replace(/(\.[^.]+)?$/, ".csv"), { type: "text/csv" });
      triggerRef.current(file);
      setFileLoaded(true);
    } catch { /* ignore */ }
    finally { setContextLoading(false); }
  }, [state]);

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

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Home
          </button>
          <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Optuna Tuning</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <StepIndicator labels={OPTUNA_STEP_LABELS} currentIndex={runnerStep - 1} accent={ACCENT} />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
        <OptunaRunner onReady={handleReady} onResult={setTrainResult} onStepChange={setRunnerStep} />
      </div>

      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Optuna Hyperparameter Tuning",
        summary: trainResult
          ? [
              `Tool: Optuna Hyperparameter Tuning | Winner model: ${trainResult.winner}`,
              `Metrics: ${Object.entries(trainResult.winner_metrics).map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(4) : v}`).join(", ")}`,
              trainResult.best_params ? `Best hyperparameters: ${Object.entries(trainResult.best_params).map(([k, v]) => `${k}=${v}`).join(", ")}` : "",
              `Top features: ${trainResult.feature_importance.slice(0, 8).map(f => `${f.feature}(${f.importance.toFixed(3)})`).join(", ")}`,
              `All model CV scores: ${trainResult.cv_results.map(c => `${c.name}=${c.score.toFixed(4)}`).join(", ")}`,
            ].filter(Boolean).join("\n")
          : "Optuna Hyperparameter Tuning tool. No training run yet — upload a CSV and run tuning first.",
      }} />
    </div>
  );
}

export default function OptunaPage() {
  useToolTracking("optuna");
  return (
    <PipelineProvider>
      <OptunaPageInner />
    </PipelineProvider>
  );
}