"use client";

import { AnimatePresence, motion } from "framer-motion";
import PreprocessStory from "./PreprocessStory";
import FEStory from "./FEStory";
import FSStory from "./FSStory";
import AutoMLStory from "./AutoMLStory";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface AutoMLResults {
  models: Array<{ name: string; score: number }>;
  winner: string;
  taskType: "classification" | "regression";
  metric: string;
}

interface Props {
  stage: StageKind | null;
  active: boolean;
  frozen?: boolean;
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
}

const STORY_MAP = {
  "preprocessing":    PreprocessStory,
  "feature-eng":      FEStory,
  "feature-select":   FSStory,
  "automl":           AutoMLStory,
} as const;

const STAGE_META: Record<StageKind, { label: string; accent: string }> = {
  "preprocessing":   { label: "Preprocessing",       accent: "#3e7c98" },
  "feature-eng":     { label: "Feature Engineering", accent: "#4c806d" },
  "feature-select":  { label: "Feature Selection",   accent: "#966f2b" },
  "automl":          { label: "AutoML",               accent: "#7e68c0" },
};

const PulsingDots = () => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
        style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text3)" }}
      />
    ))}
  </div>
);

export default function StageStory({ stage, active, frozen = false, taskType, csvPreviewCols, csvPreviewRows, stageColumns, automlResults }: Props) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflowY: "auto" }}>
      <AnimatePresence mode="wait">
        {stage === null ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
              Click Run Cinema to start
            </div>
            <PulsingDots />
          </motion.div>
        ) : (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
          >
            {/* Header */}
            <div style={{
              padding: "8px 16px",
              fontSize: 11, fontWeight: 700,
              color: STAGE_META[stage].accent,
              textTransform: "uppercase", letterSpacing: 2,
              borderBottom: "1px solid var(--border2)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: STAGE_META[stage].accent,
                boxShadow: `0 0 6px ${STAGE_META[stage].accent}`,
              }} />
              {STAGE_META[stage].label}
            </div>

            {/* Story content */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(() => {
                if (stage === "preprocessing") {
                  return <PreprocessStory active={active} csvPreviewCols={csvPreviewCols} csvPreviewRows={csvPreviewRows} />;
                }
                if (stage === "feature-eng") {
                  return <FEStory active={active} sourceCols={stageColumns?.afterPreprocess} engineeredCols={stageColumns?.engineeredCols} />;
                }
                if (stage === "feature-select") {
                  return <FSStory active={active} frozen={frozen} allCols={stageColumns?.afterFE} keptCols={stageColumns?.afterFS} />;
                }
                if (stage === "automl") {
                  return <AutoMLStory active={active} frozen={frozen} taskType={taskType} automlResults={automlResults} />;
                }
                return null;
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
