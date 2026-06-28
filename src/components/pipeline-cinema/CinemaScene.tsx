"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import PipelineCharacter from "./PipelineCharacter";
import DataOrb from "./DataOrb";
import StageStory from "./stories/StageStory";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";
type CharacterState = "idle" | "active" | "done";

interface Props {
  activeStage: StageKind | null;
  doneStages: Set<StageKind>;
  orbProgress: number;
  orbActive: boolean;
}

const STAGES: StageKind[] = ["preprocessing", "feature-eng", "feature-select", "automl"];
const X_PERCENTS = [0.12, 0.37, 0.63, 0.88];
const ACCENTS: Record<StageKind, string> = {
  preprocessing: "#38bdf8",
  "feature-eng": "#34d399",
  "feature-select": "#f59e0b",
  automl: "#a78bfa",
};
const TRACK_Y = 155;

export default function CinemaScene({ activeStage, doneStages, orbProgress, orbActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => observer.disconnect();
  }, []);

  const stageX = X_PERCENTS.map((p) => p * containerWidth);
  const orbX = orbProgress * containerWidth;

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
        height: 540,
        position: "relative",
        background: "linear-gradient(180deg, #060d1a 0%, #0a1628 100%)",
        borderRadius: 16,
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
        animate={{ y: [-80, 400] }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      />

      {/* Track base line */}
      <div
        style={{
          position: "absolute",
          top: TRACK_Y,
          left: "7.5%",
          width: "85%",
          height: 3,
          background: "#1e3a5f",
          borderRadius: 2,
          zIndex: 2,
        }}
      />

      {/* Connector segments between stages */}
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
              top: TRACK_Y,
              left: leftX,
              height: 3,
              background: "#38bdf8",
              borderRadius: 2,
              zIndex: 3,
              transformOrigin: "left center",
              width: segWidth,
              originX: 0,
            }}
            animate={{ scaleX: isDone ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        );
      })}

      {/* Stage glows + Characters */}
      {STAGES.map((stage, i) => {
        const state = stateFor(stage);
        const x = stageX[i];
        const accent = ACCENTS[stage];
        return (
          <div
            key={stage}
            style={{
              position: "absolute",
              left: x,
              top: TRACK_Y,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
            }}
          >
            {/* Stage glow dot */}
            <motion.div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: state === "idle" ? "#1e3a5f" : accent,
                boxShadow: state !== "idle" ? `0 0 12px ${accent}` : "none",
                margin: "0 auto",
              }}
              animate={{ scale: state === "active" ? [1, 1.3, 1] : 1 }}
              transition={{ repeat: state === "active" ? Infinity : 0, duration: 0.8 }}
            />
            {/* Character positioned above track */}
            <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)" }}>
              <PipelineCharacter stage={stage} state={state} accent={accent} />
            </div>
          </div>
        );
      })}

      {/* Data Orb */}
      <div style={{ position: "absolute", top: TRACK_Y, zIndex: 6 }}>
        <motion.div
          animate={{ x: orbX }}
          transition={orbActive ? { type: "spring", stiffness: 80, damping: 18 } : { duration: 0 }}
          style={{ position: "absolute", top: 0 }}
        >
          <DataOrb x={0} y={0} active={orbActive} color="#38bdf8" />
        </motion.div>
      </div>

      {/* Divider between track and story panel */}
      <div style={{ position: "absolute", top: 220, left: 0, right: 0, height: 1, background: "#0f2744" }} />

      {/* Story panel */}
      <div style={{ position: "absolute", top: 221, left: 0, right: 0, bottom: 0, background: "#070f1e", overflow: "hidden" }}>
        <StageStory stage={activeStage} active={activeStage !== null} />
      </div>
    </div>
  );
}