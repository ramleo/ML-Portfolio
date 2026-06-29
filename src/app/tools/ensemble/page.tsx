"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import CsvFromContextBanner from "@/components/CsvFromContextBanner";
import EnsembleRunner from "./EnsembleRunner";

const ACCENT = "#f472b6";

function EnsemblePageInner() {
  const router = useRouter();
  const { state, setState } = usePipeline();
  const triggerRef = useRef<((f: File) => void) | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);

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
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
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
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>Step 3</span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Ensemble Methods</span>
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
        <EnsembleRunner onReady={handleReady} />
      </div>

      <ToolsAIChat context={{
        tool: "Ensemble & Stacking",
        summary: "Ensemble learning visualiser covering soft voting, hard voting, and stacking with a meta-learner. Shows how combining diverse base models (XGBoost, Random Forest, LightGBM) reduces variance and improves AUC over any single model.",
      }} />
    </div>
  );
}

export default function EnsemblePage() {
  return (
    <PipelineProvider>
      <EnsemblePageInner />
    </PipelineProvider>
  );
}