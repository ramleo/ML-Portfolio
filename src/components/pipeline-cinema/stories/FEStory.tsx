"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Generic FE technique labels (educational, not dataset-specific)
const FE_STEPS = [
  { label: "log transform",  desc: "log1p reduces right-skew; keeps zero values valid" },
  { label: "interaction",    desc: "interaction terms capture combined effects of two features" },
  { label: "polynomial",     desc: "polynomial features expose non-linear decision boundaries" },
];

const pillBase: React.CSSProperties = {
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 11,
  display: "inline-block",
  whiteSpace: "nowrap" as const,
};

const sourcePill: React.CSSProperties = {
  ...pillBase,
  background: "#0f2744",
  border: "1px solid #1e3a5f",
  color: "#94a3b8",
};

const newPill: React.CSSProperties = {
  ...pillBase,
  background: "rgba(52,211,153,0.15)",
  border: "1px solid #34d399",
  color: "#34d399",
};

interface Props {
  active: boolean;
  taskType?: "classification" | "regression";
  sourceCols?: string[];
  engineeredCols?: string[];
}

export default function FEStory({ active, sourceCols, engineeredCols }: Props) {
  const demoSource = ["Age", "Fare", "Pclass", "Sex"];
  const displaySource = (sourceCols && sourceCols.length > 0) ? sourceCols.slice(0, 5) : demoSource;

  let displayEngineered: string[] = [];
  let noNewFeatures = false;

  if (engineeredCols !== undefined) {
    // Real data: engineeredCols directly from API
    if (engineeredCols.length > 0) {
      for (let i = 0; i < Math.min(engineeredCols.length, 6); i += 2) {
        displayEngineered.push(engineeredCols.slice(i, i + 2).join(", "));
      }
    } else {
      noNewFeatures = true;
      displayEngineered = [];
    }
  } else {
    // No CSV loaded: show demo
    displayEngineered = ["Age_log1p", "Age×Fare", "Age², Pclass²"];
  }

  const featuresAdded = engineeredCols ? engineeredCols.length : displayEngineered.length;

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setStep((s) => (s >= 4 ? 0 : s + 1));
    }, 1600);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) setStep(0);
  }, [active]);

  const visibleEngineered = step === 0 ? [] : step >= 4 ? displayEngineered : [displayEngineered[step - 1]].filter(Boolean);
  const desc = step > 0 && step < 4
    ? FE_STEPS[step - 1].desc
    : step === 4
    ? `${featuresAdded} engineered features added to feature matrix`
    : "";

  // Generic beam sources: for step N (1-3), use indices (N-1) % n and N % n from displaySource
  const getBeamSources = (stepN: number): number[] => {
    const n = displaySource.length;
    const a = ((stepN - 1) % n + n) % n;
    const b = stepN % n;
    return a === b ? [a] : [a, b];
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 8, padding: "1rem", position: "relative" }}>
      {/* Counter badge */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div
            key="counter"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 12, right: 12, background: "#34d399", color: "#000", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700, zIndex: 10 }}
          >
            +{featuresAdded} features
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div style={{ flex: 1, display: "flex", gap: 0, alignItems: "center", minHeight: 0 }}>
        {/* Left: Source columns */}
        <div style={{ width: "30%", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>SOURCE</div>
          {displaySource.map((col, idx) => {
            const isActive = step > 0 && step < 4
              ? idx === (step - 1) % displaySource.length || idx === step % displaySource.length
              : step === 4;
            return (
              <motion.div
                key={col}
                animate={{ borderColor: isActive ? "#34d399" : "#1e3a5f", color: isActive ? "#e2e8f0" : "#94a3b8" }}
                transition={{ duration: 0.3 }}
                style={{ ...sourcePill }}
              >
                {col}
              </motion.div>
            );
          })}
        </div>

        {/* Middle: Beam SVG area */}
        <div style={{ width: "40%", position: "relative", height: "100%", minHeight: 120 }}>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <AnimatePresence>
              {(step > 0 && step < 4 ? [step] : step >= 4 ? [1, 2, 3] : []).map((stepN, i) => {
                const sourceIndices = getBeamSources(stepN);
                const targetY = 32 + i * 36;
                return sourceIndices.map((srcIdx, si) => {
                  const sy = 32 + srcIdx * 32;
                  return (
                    <motion.line
                      key={`beam-${stepN}-${si}`}
                      x1="0%"
                      y1={sy}
                      x2="100%"
                      y2={targetY}
                      stroke="#34d399"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      initial={{ strokeDashoffset: 40, opacity: 0 }}
                      animate={{ strokeDashoffset: 0, opacity: 0.7 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, ease: "linear" }}
                    />
                  );
                });
              })}
            </AnimatePresence>
          </svg>

          {/* Step label in center */}
          <AnimatePresence mode="wait">
            {step > 0 && step < 4 && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(52,211,153,0.1)", border: "1px solid #34d399", borderRadius: 4, padding: "2px 7px", fontSize: 9, color: "#34d399", whiteSpace: "nowrap", fontWeight: 600 }}
              >
                {FE_STEPS[step - 1].label}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: New feature pills */}
        <div style={{ width: "30%", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>ENGINEERED</div>
          {noNewFeatures ? (
            <div style={{ fontSize: 10, color: "#475569", textAlign: "right", marginTop: 8 }}>
              No new features added.<br />Configure transforms in Pipeline Builder.
            </div>
          ) : (
            <AnimatePresence>
              {visibleEngineered.map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.08 }}
                  style={{ ...newPill }}
                >
                  {label}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom description */}
      <AnimatePresence mode="wait">
        {desc && (
          <motion.div
            key={desc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 10, color: "#475569", textAlign: "center", paddingBottom: 2 }}
          >
            {desc}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}