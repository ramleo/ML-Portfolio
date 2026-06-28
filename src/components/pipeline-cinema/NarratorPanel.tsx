"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  activeStage: StageKind | null;
  running: boolean;
}

const STAGE_INTERVALS: Record<StageKind, number> = {
  preprocessing: 1400,
  "feature-eng": 1600,
  "feature-select": 1800,
  automl: 2000,
};

const SCRIPTS: Record<StageKind, string[]> = {
  preprocessing: [
    "Alright, let's start! Loading the raw dataset. I can already spot some missing values in Age and Cabin...",
    "Imputing 177 missing Age values using the column mean (30.0). Cabin filled with most frequent value 'C23'.",
    "Found a duplicate row — identical passenger entry. Removing it. Dataset shrinks from 891 to 890 rows.",
    "Outlier alert! Fare value 512.33 is way above the IQR upper bound. Clipping it down to 262.00.",
    "The Fare column is right-skewed. Applying log1p transform to normalize the distribution.",
    "Preprocessing complete! Dataset is clean — no missing values, no duplicates, outliers handled. Ready for feature engineering!",
  ],
  "feature-eng": [
    "Time to engineer some features! We have 4 raw columns: Age, Fare, Pclass, Sex.",
    "Applying log1p transform to Age → Age_log1p. This reduces skew and makes the scale more model-friendly.",
    "Creating interaction feature Age × Fare. This captures the combined effect — young passengers with high fares behave differently!",
    "Polynomial expansion on Age and Pclass, degree 2. Adds Age², Pclass², and Age×Pclass squared terms.",
    "Done! 4 new features created. We've gone from 4 to 8 features. More signal for the model!",
  ],
  "feature-select": [
    "Feature selection time. We have 10 features after engineering. Not all of them are useful!",
    "Calculating importance scores using mutual information. Higher score = more predictive power.",
    "4 features are below the 0.50 threshold: Embarked_S, Embarked_C, Fare_sqrt, Cabin_missing. They add noise, not signal.",
    "Dropped the 4 weak features. Kept the top 6. Leaner dataset means faster training and less overfitting!",
  ],
  automl: [
    "AutoML starting! I'm about to train 4 different models and let them compete for best accuracy.",
    "Models initialized: Random Forest, XGBoost, LightGBM, and Logistic Regression. 5-fold cross-validation on each.",
    "Results in! Random Forest: 82.1%, XGBoost: 84.7%, LightGBM: 83.9%, Logistic Regression: 78.3%.",
    "We have a winner — XGBoost with 84.7% accuracy! It handles complex feature interactions very well.",
    "Pro tip: Combining the top 3 models in an ensemble boosts accuracy to 86.1%. That's what the Ensemble stage does!",
  ],
};

const ACCENT_COLORS: Record<StageKind, string> = {
  preprocessing: "#38bdf8",
  "feature-eng": "#34d399",
  "feature-select": "#f59e0b",
  automl: "#a78bfa",
};

const STAGE_LABELS: Record<StageKind, string> = {
  preprocessing: "Preprocessing",
  "feature-eng": "Feature Engineering",
  "feature-select": "Feature Selection",
  automl: "AutoML",
};

const IDLE_TEXT =
  "Hello! I'm your ML guide. Hit 'Run Animation' to watch the full pipeline in action. I'll explain each step as it happens!";

export default function NarratorPanel({ activeStage, running }: Props) {
  const [step, setStep] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);

  const speaking = running && activeStage !== null;

  // Reset step when stage changes
  useEffect(() => {
    setStep(0);
  }, [activeStage]);

  // Advance step on interval
  useEffect(() => {
    if (!speaking || !activeStage) return;
    const interval = STAGE_INTERVALS[activeStage];
    const id = setInterval(() => {
      setStep((prev) => {
        const max = SCRIPTS[activeStage].length - 1;
        return prev < max ? prev + 1 : prev;
      });
    }, interval);
    return () => clearInterval(id);
  }, [speaking, activeStage]);

  // Mouth animation
  useEffect(() => {
    if (!speaking) {
      setMouthOpen(false);
      return;
    }
    const id = setInterval(() => setMouthOpen((prev) => !prev), 300);
    return () => clearInterval(id);
  }, [speaking]);

  const currentText =
    activeStage !== null
      ? SCRIPTS[activeStage][Math.min(step, SCRIPTS[activeStage].length - 1)]
      : IDLE_TEXT;

  const mouthD = mouthOpen
    ? "M33,37 Q40,44 47,37"
    : "M33,38 Q40,42 47,38";

  return (
    <div
      style={{
        width: 240,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem 0.75rem",
        background: "#070f1e",
        borderRight: "1px solid #0f2744",
        boxSizing: "border-box",
      }}
    >
      {/* Avatar */}
      <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
        {/* Body */}
        <path d="M18,52 Q40,48 62,52 L62,85 L18,85 Z" fill="#0f2744" stroke="#1e3a5f" strokeWidth="1" />
        {/* Collar line */}
        <line x1="18" y1="55" x2="62" y2="55" stroke="#1e3a5f" strokeWidth="1" />
        {/* Tie */}
        <polygon points="40,55 37,62 40,70 43,62" fill="#38bdf8" opacity="0.7" />
        {/* Head */}
        <circle cx="40" cy="30" r="22" fill="#1e3a5f" stroke="#38bdf8" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="33" cy="27" r="3" fill="#38bdf8" />
        <circle cx="47" cy="27" r="3" fill="#38bdf8" />
        {/* Mouth */}
        <motion.path
          d={mouthD}
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ d: mouthD }}
          transition={{ duration: 0.15 }}
        />
        {/* Microphone */}
        <rect x="36" y="52" width="8" height="14" rx="4" fill="#38bdf8" />
        <line x1="40" y1="66" x2="40" y2="71" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="36" y1="71" x2="44" y2="71" stroke="#38bdf8" strokeWidth="1.5" />
      </svg>

      {/* Speech bubble */}
      <div
        style={{
          background: "#0f2744",
          border: "1px solid #1e3a5f",
          borderRadius: 10,
          padding: "0.75rem",
          width: "100%",
          minHeight: 120,
          position: "relative",
          marginTop: 12,
          boxSizing: "border-box",
        }}
      >
        {/* Triangle pointer */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: 16,
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "8px solid #0f2744",
          }}
        />
        <AnimatePresence mode="wait">
          <motion.p
            key={`${activeStage}-${step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            style={{ fontSize: 12, lineHeight: 1.6, color: "#94a3b8", margin: 0 }}
          >
            {currentText}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Stage indicator */}
      {activeStage !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            alignSelf: "flex-start",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: ACCENT_COLORS[activeStage],
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: ACCENT_COLORS[activeStage], fontWeight: 500 }}>
            {STAGE_LABELS[activeStage]}
          </span>
        </div>
      )}
    </div>
  );
}