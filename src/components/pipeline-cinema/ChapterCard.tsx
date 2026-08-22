"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  chapterStage: StageKind | null;
  onDismiss: () => void;
}

const CHAPTER_NUMBERS: Record<StageKind, number> = {
  preprocessing: 1,
  "feature-eng": 2,
  "feature-select": 3,
  automl: 4,
};

const STAGE_NAMES: Record<StageKind, string> = {
  preprocessing: "Preprocessing",
  "feature-eng": "Feature Engineering",
  "feature-select": "Feature Selection",
  automl: "AutoML",
};

const TAGLINES: Record<StageKind, string> = {
  preprocessing: "Cleaning your data for model training",
  "feature-eng": "Creating new signals from raw columns",
  "feature-select": "Keeping only what matters",
  automl: "Finding the best model automatically",
};

const ACCENTS: Record<StageKind, string> = {
  preprocessing: "#38bdf8",
  "feature-eng": "#34d399",
  "feature-select": "#f59e0b",
  automl: "#a78bfa",
};

export default function ChapterCard({ chapterStage, onDismiss }: Props) {
  useEffect(() => {
    if (!chapterStage) return;
    const id = setTimeout(onDismiss, 1600);
    return () => clearTimeout(id);
  }, [chapterStage, onDismiss]);

  return (
    <AnimatePresence>
      {chapterStage && (
        <motion.div
          key={chapterStage}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "color-mix(in srgb, var(--bg) 92%, transparent)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <span
            style={{
              fontVariant: "small-caps",
              fontSize: 11,
              color: "var(--text3)",
              letterSpacing: 6,
              marginBottom: 10,
            }}
          >
            Chapter {CHAPTER_NUMBERS[chapterStage]}
          </span>
          <span
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: ACCENTS[chapterStage],
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {STAGE_NAMES[chapterStage]}
          </span>
          <span
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "var(--text3)",
              textAlign: "center",
            }}
          >
            {TAGLINES[chapterStage]}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}