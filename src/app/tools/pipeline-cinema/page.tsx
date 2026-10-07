"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
import CinemaScene from "@/components/pipeline-cinema/CinemaScene";
import CsvUploadBar from "@/components/pipeline-cinema/CsvUploadBar";
import { usePipelineRunner, STAGES, STAGE_META } from "./usePipelineRunner";
import ToolBackNav from "@/components/ToolBackNav";
import ToolGuideModal from "@/components/ToolGuideModal";
import { PIPELINE_CINEMA_GUIDE } from "./userGuide";
import { parseCsvB64, parseCsvPreview, PlayIcon, PauseIcon, StopIcon } from "./cinemaHelpers";

const ACCENT = "#c2693f";

export default function PipelineCinemaPage() {
  useToolTracking("pipeline-cinema");
  const [guideOpen, setGuideOpen] = useState(false);

  // CSV / config state
  const [csvB64, setCsvB64] = useState<string | null>(null);
  const [csvName, setCsvName] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [target, setTarget] = useState<string>("");
  const [taskType, setTaskType] = useState<"classification" | "regression">("classification");
  const [csvPreviewCols, setCsvPreviewCols] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);

  // Animation state and handlers from hook
  const {
    activeStage,
    doneStages,
    running,
    orbProgress,
    dynamicLines,
    chapterStage,
    apiError,
    paused,
    stageColumns,
    automlResults,
    viewingStage,
    setViewingStage,
    handleRunAnimation,
    handleStop,
    handleReset,
    togglePause,
    handleStageClick,
    setChapterStage,
  } = usePipelineRunner({ csvB64, target, taskType });

  // File handling
  const handleFile = useCallback((file: File) => {
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const binary = e.target?.result as string;
      const b64 = btoa(binary);
      setCsvB64(b64);
      const cols = parseCsvB64(b64);
      setColumns(cols);
      setTarget(cols[cols.length - 1] ?? "");
      const preview = parseCsvPreview(b64);
      setCsvPreviewCols(preview.columns);
      setCsvPreviewRows(preview.rows);
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleClearCsv = useCallback(() => {
    setCsvB64(null);
    setCsvName("");
    setColumns([]);
    setTarget("");
    setCsvPreviewCols([]);
    setCsvPreviewRows([]);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      <ConstellationBackground />
      <main style={{ minHeight: "100vh", position: "relative", zIndex: 1, padding: "2rem 2rem 10rem" }}>

        {/* Header */}
        <header style={{ maxWidth: 900, margin: "0 auto 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem" }}>
            <ToolBackNav toolId="pipeline-cinema" flush />
            <Link
              href="/tools/pipeline-builder"
              className="tool-back-link"
              style={{ color: "#38bdf8" }}
            >
              ← Pipeline Builder
            </Link>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button onClick={() => setGuideOpen(true)}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
                style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                User Guide
              </button>
              <ThemeToggle />
            </div>
          </div>
          <ToolGuideModal open={guideOpen} onClose={() => setGuideOpen(false)}
            guide={PIPELINE_CINEMA_GUIDE} title="Pipeline Cinema" accent={ACCENT} toolId="pipeline-cinema" />
          <h1 style={{ color: "var(--text)", fontSize: "2rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
            Pipeline Cinema
          </h1>
          <p style={{ color: "var(--text3)", fontSize: "0.9rem", margin: 0 }}>
            Watch your data transform — stage by stage
          </p>
        </header>

        {/* CSV upload / meta bar */}
        <CsvUploadBar
          csvB64={csvB64}
          csvName={csvName}
          columns={columns}
          target={target}
          taskType={taskType}
          onFile={handleFile}
          onTarget={setTarget}
          onTaskType={setTaskType}
          onClear={handleClearCsv}
        />

        {/* API error banner */}
        {apiError && (
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 8,
              padding: "0.6rem 1rem",
              color: "#ef4444",
              fontSize: "0.8rem",
            }}
          >
            {apiError}
          </div>
        )}

        {/* Scene */}
        <div data-wt="cin-scene" style={{ margin: "0 auto 2rem", width: "100%", maxWidth: 1200 }}>
          <CinemaScene
            activeStage={activeStage}
            doneStages={doneStages}
            orbProgress={orbProgress}
            orbActive={running || activeStage !== null}
            running={running}
            dynamicLines={dynamicLines}
            chapterStage={chapterStage}
            onChapterDismiss={() => setChapterStage(null)}
            taskType={taskType}
            csvPreviewCols={csvPreviewCols}
            csvPreviewRows={csvPreviewRows}
            stageColumns={stageColumns}
            automlResults={automlResults}
            viewingStage={viewingStage}
          />
        </div>

        {/* Run complete.
            Without this the screen has no ending: the story panel drops back to
            "Click Run Cinema to start" the moment the last scene finishes, which
            reads as though the run was thrown away. It was not — every stage is
            still there behind its pill, and this is the only thing that says so. */}
        {!running && doneStages.size === STAGES.length && (
          <div
            data-wt="cin-done"
            style={{
              maxWidth: 900,
              margin: "0 auto 2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              padding: "0.7rem 1rem",
              borderRadius: 10,
              border: "1px solid rgba(52,211,153,0.35)",
              background: "rgba(52,211,153,0.08)",
              color: "var(--text2)",
              fontSize: "0.82rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            All four stages finished — pick any stage below to look at it again.
          </div>
        )}

        {/* Controls */}
        <div
          data-wt="cin-controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
            margin: "1rem 0 2rem",
          }}
        >
          {STAGES.map((stage) => {
            const { label, accent } = STAGE_META[stage];
            const isDone = doneStages.has(stage);
            const isActive = activeStage === stage;
            const isViewing = running && viewingStage === stage;
            return (
              <motion.button
                key={stage}
                data-wt={`cin-stage-${stage}`}
                onClick={() => handleStageClick(stage)}
                disabled={running && !isDone}
                whileHover={{ scale: running && !isDone ? 1 : 1.05 }}
                whileTap={{ scale: running && !isDone ? 1 : 0.97 }}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: 999,
                  border: `1.5px solid ${isActive || isDone ? accent : "var(--border2)"}`,
                  background: isDone ? `${accent}22` : isActive ? `${accent}15` : "transparent",
                  color: isActive || isDone ? accent : "var(--text3)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: running && !isDone ? "default" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: isViewing ? `0 0 0 2px ${accent}` : "none",
                }}
              >
                {isViewing ? `• ${label}` : label}
              </motion.button>
            );
          })}

          <div style={{ width: 1, height: 28, background: "var(--border2)" }} />

          <motion.button
            data-wt="cin-run"
            onClick={handleRunAnimation}
            disabled={running}
            whileHover={{ scale: running ? 1 : 1.03 }}
            whileTap={{ scale: running ? 1 : 0.97 }}
            style={{
              padding: "0.7rem 2rem",
              borderRadius: 10,
              background: running ? "var(--border2)" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
              color: running ? "var(--text3)" : "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              border: "none",
              cursor: running ? "default" : "pointer",
            }}
          >
            {running ? "Running…" : "Run Cinema"}
          </motion.button>

          {running && (
            <motion.button
              onClick={togglePause}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "0.7rem 1.4rem",
                borderRadius: 10,
                background: paused ? "var(--bg-card)" : "transparent",
                color: paused ? "#38bdf8" : "var(--text3)",
                fontWeight: 600,
                fontSize: "0.95rem",
                border: `1.5px solid ${paused ? "#38bdf8" : "var(--border2)"}`,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Resume" : "Pause"}
            </motion.button>
          )}

          {running && (
            <motion.button
              onClick={handleStop}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "0.7rem 1.4rem",
                borderRadius: 10,
                background: "transparent",
                color: "#f87171",
                fontWeight: 600,
                fontSize: "0.95rem",
                border: "1.5px solid #7f1d1d",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <StopIcon />
              Stop
            </motion.button>
          )}

          <motion.button
            onClick={handleReset}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "0.7rem 1.4rem",
              borderRadius: 10,
              background: "transparent",
              color: "var(--text3)",
              fontWeight: 600,
              fontSize: "0.95rem",
              border: "1.5px solid var(--border2)",
              cursor: "pointer",
            }}
          >
            Reset
          </motion.button>
        </div>

      </main>
    </div>
  );
}