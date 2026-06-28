"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

interface Props {
  activeStage: StageKind | null;
  running: boolean;
  dynamicLines?: Partial<Record<StageKind, string[]>>;
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

export default function NarratorPanel({ activeStage, running, dynamicLines }: Props) {
  const [step, setStep] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(false);

  const speaking = running && activeStage !== null;

  useEffect(() => { setStep(0); }, [activeStage]);

  useEffect(() => {
    if (!speaking || !activeStage) return;
    const lines =
      dynamicLines?.[activeStage]?.length
        ? dynamicLines[activeStage]!
        : SCRIPTS[activeStage];
    const interval = STAGE_INTERVALS[activeStage];
    const id = setInterval(() => {
      setStep((prev) => (prev < lines.length - 1 ? prev + 1 : prev));
    }, interval);
    return () => clearInterval(id);
  }, [speaking, activeStage, dynamicLines]);

  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen((p) => !p), 280);
    return () => clearInterval(id);
  }, [speaking]);

  const lines =
    activeStage && dynamicLines?.[activeStage]?.length
      ? dynamicLines[activeStage]!
      : activeStage
      ? SCRIPTS[activeStage]
      : null;

  const currentText = lines
    ? lines[Math.min(step, lines.length - 1)]
    : "Hello! I'm your ML guide. Hit 'Run Animation' to watch the full pipeline in action.";

  const mouthPath = mouthOpen ? "M14,25 Q20,31 26,25" : "M14,26 Q20,30 26,26";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 88,
        background:
          "linear-gradient(0deg, rgba(6,13,26,0.97) 0%, rgba(6,13,26,0.85) 70%, transparent 100%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 1.5rem",
        zIndex: 20,
        boxSizing: "border-box",
      }}
    >
      {/* Avatar */}
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="16" fill="#0f2744" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="14" cy="17" r="2.5" fill="#38bdf8" />
        <circle cx="26" cy="17" r="2.5" fill="#38bdf8" />
        <motion.path
          d={mouthPath}
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={{ d: mouthPath }}
          transition={{ duration: 0.12 }}
        />
        <rect x="16" y="34" width="8" height="10" rx="4" fill="#38bdf8" />
      </svg>

      {/* Speech area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeStage !== null && (
          <div style={{ marginBottom: 3 }}>
            <span
              style={{
                color: ACCENT_COLORS[activeStage],
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              ● {STAGE_LABELS[activeStage]}
            </span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.p
            key={`${activeStage}-${step}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: activeStage !== null ? "#94a3b8" : "#334155",
              margin: 0,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {currentText}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}