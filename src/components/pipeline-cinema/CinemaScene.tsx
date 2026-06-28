"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import StageIcon from "./StageIcon";
import DataOrb from "./DataOrb";
import StageStory from "./stories/StageStory";
import NarratorPanel from "./NarratorPanel";
import ChapterCard from "./ChapterCard";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";
type CharacterState = "idle" | "active" | "done";

interface AutoMLResults {
  models: Array<{ name: string; score: number }>;
  winner: string;
  taskType: "classification" | "regression";
  metric: string;
}

interface Props {
  activeStage: StageKind | null;
  doneStages: Set<StageKind>;
  orbProgress: number;
  orbActive: boolean;
  running: boolean;
  dynamicLines?: Partial<Record<StageKind, string[]>>;
  chapterStage?: StageKind | null;
  onChapterDismiss?: () => void;
  taskType?: "classification" | "regression";
  csvPreviewCols?: string[];
  csvPreviewRows?: string[][];
  stageColumns?: {
    afterPreprocess?: string[];
    afterFE?: string[];
    afterFS?: string[];
    engineeredCols?: string[];
  };
  automlResults?: AutoMLResults | null;
  viewingStage?: StageKind | null;
}

const STAGES: StageKind[] = ["preprocessing", "feature-eng", "feature-select", "automl"];
const X_PERCENTS = [0.12, 0.37, 0.63, 0.88];
const ACCENTS: Record<StageKind, string> = {
  preprocessing: "#38bdf8",
  "feature-eng": "#34d399",
  "feature-select": "#f59e0b",
  automl: "#a78bfa",
};

export default function CinemaScene({
  activeStage,
  doneStages,
  orbProgress,
  orbActive,
  running,
  dynamicLines,
  chapterStage,
  onChapterDismiss,
  taskType,
  csvPreviewCols,
  csvPreviewRows,
  stageColumns,
  automlResults,
  viewingStage,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const [containerHeight, setContainerHeight] = useState(420);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setContainerWidth(rect.width);
      setContainerHeight(rect.height);
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    setContainerHeight(containerRef.current.offsetHeight);
    return () => observer.disconnect();
  }, []);

  const stageX = X_PERCENTS.map((p) => p * containerWidth);
  const orbX = orbProgress * containerWidth;
  const trackY = containerHeight * 0.38;
  const storyTop = containerHeight * 0.44;
  const storyHeight = containerHeight * 0.40;

  function stateFor(stage: StageKind): CharacterState {
    if (doneStages.has(stage)) return "done";
    if (activeStage === stage) return "active";
    return "idle";
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        aspectRatio: "16/9",
        minHeight: 420,
        maxHeight: 680,
        position: "relative",
        background: "linear-gradient(180deg, #030810 0%, #060d1a 40%, #0a1628 100%)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#38bdf8",
          fontSize: 11,
          fontVariant: "small-caps",
          letterSpacing: 4,
          fontWeight: 600,
          zIndex: 10,
        }}
      >
        Pipeline Cinema
      </div>

      {/* Scan-line */}
      <motion.div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 80,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.03) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
        animate={{ y: [-80, containerHeight + 80] }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      />

      {/* Track base line */}
      <div
        style={{
          position: "absolute",
          top: trackY,
          left: "7.5%",
          width: "85%",
          height: 3,
          background: "#1e3a5f",
          borderRadius: 2,
          zIndex: 2,
        }}
      />

      {/* Connector segments */}
      {STAGES.slice(0, -1).map((stage, i) => {
        const leftX = stageX[i];
        const rightX = stageX[i + 1];
        const segWidth = rightX - leftX;
        const isDone = doneStages.has(stage);
        return (
          <motion.div
            key={`seg-${i}`}
            style={{
              position: "absolute",
              top: trackY,
              left: leftX,
              height: 3,
              background: "#38bdf8",
              borderRadius: 2,
              zIndex: 3,
              width: segWidth,
              originX: 0,
            }}
            animate={{ scaleX: isDone ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        );
      })}

      {/* Spotlights + Stage icons */}
      {STAGES.map((stage, i) => {
        const state = stateFor(stage);
        const x = stageX[i];
        const accent = ACCENTS[stage];
        const isActive = state === "active";
        return (
          <div
            key={stage}
            style={{
              position: "absolute",
              left: x,
              top: trackY,
              transform: "translate(-50%, -50%)",
              zIndex: 8,
            }}
          >
            {/* Spotlight radial glow */}
            {isActive && (
              <motion.div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: `radial-gradient(ellipse, ${accent}22 0%, transparent 70%)`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 4,
                }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
              />
            )}

            {/* Stage glow dot */}
            <motion.div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: state === "idle" ? "#1e3a5f" : accent,
                boxShadow: state === "active" ? `0 0 16px 4px ${accent}` : state === "done" ? `0 0 8px ${accent}` : "none",
                margin: "0 auto",
                opacity: state === "idle" ? 0.4 : 1,
              }}
              animate={{ scale: isActive ? [1, 1.4, 1] : 1 }}
              transition={{ repeat: isActive ? Infinity : 0, duration: 0.8 }}
            />

            {/* Stage icon */}
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: "50%",
                transform: `translateX(-50%) scale(${isActive ? 1.1 : 1})`,
                opacity: state === "idle" ? 0.35 : 1,
                transition: "opacity 0.3s, transform 0.3s",
              }}
            >
              <StageIcon stage={stage} state={state} accent={accent} />
            </div>
          </div>
        );
      })}

      {/* Data Orb */}
      <div style={{ position: "absolute", top: trackY, zIndex: 6 }}>
        <motion.div
          animate={{ x: orbX }}
          transition={orbActive ? { type: "spring", stiffness: 80, damping: 18 } : { duration: 0 }}
          style={{ position: "absolute", top: 0 }}
        >
          <div style={{ transform: "translate(-50%, -50%)" }}>
            <DataOrb x={0} y={0} active={orbActive} color="#38bdf8" />
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          top: storyTop - 1,
          left: 0,
          right: 0,
          height: 1,
          background: "#0f2744",
        }}
      />

      {/* Story panel */}
      <div
        style={{
          position: "absolute",
          top: storyTop,
          left: 0,
          right: 0,
          height: storyHeight,
          background: "#070f1e",
          overflowY: "auto",
        }}
      >
        <StageStory stage={viewingStage ?? activeStage} active={activeStage !== null || viewingStage !== null} frozen={viewingStage !== null && activeStage === null} taskType={taskType} csvPreviewCols={csvPreviewCols} csvPreviewRows={csvPreviewRows} stageColumns={stageColumns} automlResults={automlResults} />
      </div>

      {/* Narrator strip */}
      <NarratorPanel activeStage={activeStage} running={running} dynamicLines={dynamicLines} />

      {/* Chapter card overlay */}
      <ChapterCard
        chapterStage={chapterStage ?? null}
        onDismiss={onChapterDismiss ?? (() => {})}
      />
    </div>
  );
}