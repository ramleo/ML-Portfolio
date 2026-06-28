"use client";

import { AnimatePresence, motion } from "framer-motion";
import PreprocessStory from "./PreprocessStory";
import FEStory from "./FEStory";
import FSStory from "./FSStory";
import AutoMLStory from "./AutoMLStory";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  stage: StageKind | null;
  active: boolean;
}

const STORY_MAP = {
  "preprocessing":    PreprocessStory,
  "feature-eng":      FEStory,
  "feature-select":   FSStory,
  "automl":           AutoMLStory,
} as const;

const STAGE_META: Record<StageKind, { label: string; accent: string }> = {
  "preprocessing":   { label: "Preprocessing",       accent: "#38bdf8" },
  "feature-eng":     { label: "Feature Engineering", accent: "#34d399" },
  "feature-select":  { label: "Feature Selection",   accent: "#f59e0b" },
  "automl":          { label: "AutoML",               accent: "#a78bfa" },
};

const PulsingDots = () => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
        style={{ width: 6, height: 6, borderRadius: "50%", background: "#334155" }}
      />
    ))}
  </div>
);

export default function StageStory({ stage, active }: Props) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
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
            <div style={{ fontSize: 13, color: "#334155", textAlign: "center" }}>
              Click Run Animation to start
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
              borderBottom: "1px solid #0f2744",
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
            <div style={{ flex: 1, overflow: "hidden" }}>
              {(() => {
                const Story = STORY_MAP[stage];
                return <Story active={active} />;
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
