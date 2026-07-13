"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import CinemaScene from "@/components/pipeline-cinema/CinemaScene";
import CsvUploadBar from "@/components/pipeline-cinema/CsvUploadBar";
import { usePipelineRunner, STAGES, STAGE_META } from "./usePipelineRunner";

function parseCsvB64(b64: string): string[] {
  try {
    const text = atob(b64);
    return text
      .split("\n")[0]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseCsvPreview(b64: string, maxRows = 5): { columns: string[]; rows: string[][] } {
  try {
    const text = atob(b64);
    const lines = text.split("\n").filter(Boolean);
    const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1, maxRows + 1).map((line) =>
      line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    );
    return { columns, rows };
  } catch {
    return { columns: [], rows: [] };
  }
}

export default function PipelineCinemaPage() {
  useToolTracking("pipeline-cinema");
  const router = useRouter();
  const handleHome = useCallback(() => router.push("/#capabilities"), [router]);

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
    <div style={{ minHeight: "100vh", background: "#060d1a", position: "relative" }}>
      <ConstellationBackground />
      <main style={{ minHeight: "100vh", position: "relative", zIndex: 1, padding: "2rem" }}>

        {/* Header */}
        <header style={{ maxWidth: 900, margin: "0 auto 2rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
            <button
              onClick={handleHome}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.85rem", padding: 0 }}
            >
              ← Home
            </button>
            <Link
              href="/tools/pipeline-builder"
              style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "none" }}
            >
              ← Pipeline Builder
            </Link>
          </div>
          <h1 style={{ color: "#f0f4f8", fontSize: "2rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
            Pipeline Cinema
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
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
              background: "#1a0a0a",
              border: "1px solid #7f1d1d",
              borderRadius: 8,
              padding: "0.6rem 1rem",
              color: "#fca5a5",
              fontSize: "0.8rem",
            }}
          >
            {apiError}
          </div>
        )}

        {/* Scene */}
        <div style={{ margin: "0 auto 2rem", width: "100%", maxWidth: 1200 }}>
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

        {/* Controls */}
        <div
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
                onClick={() => handleStageClick(stage)}
                disabled={running && !isDone}
                whileHover={{ scale: running && !isDone ? 1 : 1.05 }}
                whileTap={{ scale: running && !isDone ? 1 : 0.97 }}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: 999,
                  border: `1.5px solid ${isActive || isDone ? accent : "#1e3a5f"}`,
                  background: isDone ? `${accent}22` : isActive ? `${accent}15` : "transparent",
                  color: isActive || isDone ? accent : "#475569",
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

          <div style={{ width: 1, height: 28, background: "#1e3a5f" }} />

          <motion.button
            onClick={handleRunAnimation}
            disabled={running}
            whileHover={{ scale: running ? 1 : 1.03 }}
            whileTap={{ scale: running ? 1 : 0.97 }}
            style={{
              padding: "0.7rem 2rem",
              borderRadius: 10,
              background: running ? "#1e3a5f" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
              color: running ? "#475569" : "#fff",
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
                background: paused ? "#0f2744" : "transparent",
                color: paused ? "#38bdf8" : "#94a3b8",
                fontWeight: 600,
                fontSize: "0.95rem",
                border: `1.5px solid ${paused ? "#38bdf8" : "#1e3a5f"}`,
                cursor: "pointer",
              }}
            >
              {paused ? "▶ Resume" : "⏸ Pause"}
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
              }}
            >
              ⏹ Stop
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
              color: "#64748b",
              fontWeight: 600,
              fontSize: "0.95rem",
              border: "1.5px solid #1e3a5f",
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