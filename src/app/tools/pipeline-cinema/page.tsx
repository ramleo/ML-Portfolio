"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import CinemaScene from "@/components/pipeline-cinema/CinemaScene";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

const STAGES: StageKind[] = ["preprocessing", "feature-eng", "feature-select", "automl"];

const STAGE_META: Record<StageKind, { label: string; accent: string; description: string }> = {
  preprocessing: {
    label: "Preprocess",
    accent: "#38bdf8",
    description: "Cleans data — handles missing values, outliers, skewness",
  },
  "feature-eng": {
    label: "Feature Eng",
    accent: "#34d399",
    description: "Creates new features — polynomials, interactions, transforms",
  },
  "feature-select": {
    label: "Feature Select",
    accent: "#f59e0b",
    description: "Picks best features — variance, correlation, importance",
  },
  automl: {
    label: "AutoML",
    accent: "#a78bfa",
    description: "Finds best model — trains multiple algorithms, picks winner",
  },
};

export default function PipelineCinemaPage() {
  const [activeStage, setActiveStage] = useState<StageKind | null>(null);
  const [doneStages, setDoneStages] = useState<Set<StageKind>>(new Set());
  const [running, setRunning] = useState(false);
  const [orbProgress, setOrbProgress] = useState(0);

  const handleRunAnimation = useCallback(async () => {
    setRunning(true);
    setDoneStages(new Set());
    setActiveStage(null);
    setOrbProgress(0);
    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(STAGES[i]);
      setOrbProgress((i / (STAGES.length - 1)) * 0.85 + 0.06);
      await new Promise<void>((r) => setTimeout(r, 1800));
      setDoneStages((prev) => new Set([...prev, STAGES[i]]));
      setOrbProgress(((i + 1) / (STAGES.length - 1)) * 0.85 + 0.06);
      await new Promise<void>((r) => setTimeout(r, 400));
    }
    setActiveStage(null);
    setRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setActiveStage(null);
    setDoneStages(new Set());
    setOrbProgress(0);
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

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", position: "relative" }}>
      <ConstellationBackground />
      <main style={{ minHeight: "100vh", position: "relative", zIndex: 1, padding: "2rem" }}>
        {/* Header */}
        <header style={{ maxWidth: 700, margin: "0 auto 2rem" }}>
          <Link
            href="/tools/pipeline-builder"
            style={{ color: "#38bdf8", fontSize: "0.85rem", textDecoration: "none", display: "inline-block", marginBottom: "1rem" }}
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

        {/* Scene */}
        <div style={{ maxWidth: 700, margin: "0 auto 2rem" }}>
          <CinemaScene
            activeStage={activeStage}
            doneStages={doneStages}
            orbProgress={orbProgress}
            orbActive={running || activeStage !== null}
            running={running}
          />
        </div>

        {/* Controls */}
        <section style={{ maxWidth: 700, margin: "0 auto 2rem" }}>
          {/* Stage buttons */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
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
          </div>

          {/* Run / Reset */}
          <div style={{ display: "flex", gap: "1rem" }}>
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
              {running ? "Running…" : "Run Animation"}
            </motion.button>
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
        </section>

        {/* Info cards */}
        <section style={{ maxWidth: 700, margin: "0 auto 2rem", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.85rem" }}>
          {STAGES.map((stage) => {
            const { label, accent, description } = STAGE_META[stage];
            return (
              <div
                key={stage}
                style={{
                  padding: "1rem",
                  borderRadius: 10,
                  border: `1px solid ${accent}44`,
                  background: "#0a1628",
                }}
              >
                <div style={{ color: accent, fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                  {label}
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5 }}>
                  {description}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function X_PERCENT_FOR_STAGE(stage: StageKind): number {
  const percents: Record<StageKind, number> = {
    preprocessing: 0.12,
    "feature-eng": 0.37,
    "feature-select": 0.63,
    automl: 0.88,
  };
  return percents[stage];
}