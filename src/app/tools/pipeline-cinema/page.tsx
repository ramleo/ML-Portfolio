"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import CinemaScene from "@/components/pipeline-cinema/CinemaScene";
import CsvUploadBar from "@/components/pipeline-cinema/CsvUploadBar";
import {
  callPreprocess,
  callFeatureEng,
  callFeatureSelect,
  callAutoML,
} from "@/lib/pipelineCinemaApi";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

const STAGES: StageKind[] = ["preprocessing", "feature-eng", "feature-select", "automl"];

const STAGE_META: Record<StageKind, { label: string; accent: string }> = {
  preprocessing:    { label: "Preprocess",     accent: "#38bdf8" },
  "feature-eng":    { label: "Feature Eng",    accent: "#34d399" },
  "feature-select": { label: "Feature Select", accent: "#f59e0b" },
  automl:           { label: "AutoML",          accent: "#a78bfa" },
};

const STAGE_DURATIONS: Record<StageKind, number> = {
  preprocessing:    8400,
  "feature-eng":    8000,
  "feature-select": 7200,
  automl:           10000,
};

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

export default function PipelineCinemaPage() {
  // Animation state
  const [activeStage, setActiveStage] = useState<StageKind | null>(null);
  const [doneStages, setDoneStages] = useState<Set<StageKind>>(new Set());
  const [running, setRunning] = useState(false);
  const [orbProgress, setOrbProgress] = useState(0);

  // CSV / config state
  const [csvB64, setCsvB64] = useState<string | null>(null);
  const [csvName, setCsvName] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [target, setTarget] = useState<string>("");
  const [taskType, setTaskType] = useState<"classification" | "regression">("classification");

  // Dynamic narrator + chapter
  const [dynamicLines, setDynamicLines] = useState<Partial<Record<StageKind, string[]>>>({});
  const [chapterStage, setChapterStage] = useState<StageKind | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  // Waits ms but pauses when pausedRef is true — time only counts down while unpaused
  const waitPauseable = useCallback(async (ms: number) => {
    let remaining = ms;
    while (remaining > 0) {
      await new Promise<void>((r) => setTimeout(r, 100));
      if (!pausedRef.current) remaining -= 100;
    }
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────

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
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleClearCsv = useCallback(() => {
    setCsvB64(null);
    setCsvName("");
    setColumns([]);
    setTarget("");
    setDynamicLines({});
    setChapterStage(null);
    setApiError(null);
  }, []);

  // ── Animation runner ──────────────────────────────────────────────────────

  const handleRunAnimation = useCallback(async () => {
    setRunning(true);
    setDoneStages(new Set());
    setActiveStage(null);
    setOrbProgress(0);
    setDynamicLines({});
    setApiError(null);

    const hasCsv = !!csvB64 && !!target;
    let currentCsv = csvB64 ?? "";

    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i];

      // Flash chapter card
      setChapterStage(stage);
      await waitPauseable(1800);
      setChapterStage(null);

      setActiveStage(stage);
      setOrbProgress((i / (STAGES.length - 1)) * 0.85 + 0.06);

      if (hasCsv) {
        try {
          if (stage === "preprocessing") {
            const result = await callPreprocess(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, preprocessing: result.lines }));
            }
          } else if (stage === "feature-eng") {
            const result = await callFeatureEng(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, "feature-eng": result.lines }));
            }
          } else if (stage === "feature-select") {
            const result = await callFeatureSelect(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, "feature-select": result.lines }));
            }
          } else if (stage === "automl") {
            const result = await callAutoML(currentCsv, target, taskType);
            if (result) {
              setDynamicLines((p) => ({ ...p, automl: result.lines }));
            }
          }
          await waitPauseable(STAGE_DURATIONS[stage]);
        } catch {
          setApiError("API error on one or more stages — falling back to demo mode.");
          await waitPauseable(2000);
        }
      } else {
        await waitPauseable(9000);
      }

      setDoneStages((prev) => new Set([...prev, stage]));
      setOrbProgress(((i + 1) / (STAGES.length - 1)) * 0.85 + 0.06);
      await waitPauseable(400);
    }

    setActiveStage(null);
    setRunning(false);
  }, [csvB64, target, taskType]);

  const handleReset = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    setRunning(false);
    setActiveStage(null);
    setDoneStages(new Set());
    setOrbProgress(0);
    setDynamicLines({});
    setChapterStage(null);
  }, []);

  const handleStageClick = useCallback(
    (stage: StageKind) => {
      if (running) return;
      setActiveStage(stage);
      setOrbProgress(X_PERCENT_FOR_STAGE(stage));
      setTimeout(() => {
        setDoneStages((prev) => new Set([...prev, stage]));
        setActiveStage(null);
      }, 1500);
    },
    [running]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", position: "relative" }}>
      <ConstellationBackground />
      <main style={{ minHeight: "100vh", position: "relative", zIndex: 1, padding: "2rem" }}>

        {/* Header */}
        <header style={{ maxWidth: 900, margin: "0 auto 2rem" }}>
          <Link
            href="/tools/pipeline-builder"
            style={{
              color: "#38bdf8",
              fontSize: "0.85rem",
              textDecoration: "none",
              display: "inline-block",
              marginBottom: "1rem",
            }}
          >
            ← Pipeline Builder
          </Link>
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
          />
        </div>

        {/* Controls — stage pills + Run/Reset in one compact bar */}
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
            return (
              <motion.button
                key={stage}
                onClick={() => handleStageClick(stage)}
                disabled={running}
                whileHover={{ scale: running ? 1 : 1.05 }}
                whileTap={{ scale: running ? 1 : 0.97 }}
                style={{
                  padding: "0.5rem 1.1rem",
                  borderRadius: 999,
                  border: `1.5px solid ${isActive || isDone ? accent : "#1e3a5f"}`,
                  background: isDone ? `${accent}22` : isActive ? `${accent}15` : "transparent",
                  color: isActive || isDone ? accent : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: running ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {label}
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

function X_PERCENT_FOR_STAGE(stage: StageKind): number {
  const percents: Record<StageKind, number> = {
    preprocessing:    0.12,
    "feature-eng":    0.37,
    "feature-select": 0.63,
    automl:           0.88,
  };
  return percents[stage];
}
