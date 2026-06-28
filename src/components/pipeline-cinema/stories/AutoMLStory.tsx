"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEMO_MODELS = [
  { name: "Random Forest", score: 0.821, color: "#38bdf8" },
  { name: "XGBoost",       score: 0.847, color: "#f59e0b" },
  { name: "LightGBM",      score: 0.839, color: "#34d399" },
  { name: "Logistic Reg.", score: 0.783, color: "#a78bfa" },
];

const MODEL_COLORS = ["#38bdf8", "#f59e0b", "#34d399", "#a78bfa", "#e879f9", "#fb923c"];

function iconForModel(name: string, color: string) {
  if (/forest/i.test(name)) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <polygon points="10,2 15,9 5,9" fill={color} opacity="0.9" />
        <polygon points="10,6 16,14 4,14" fill={color} opacity="0.7" />
        <rect x="8.5" y="14" width="3" height="4" rx="1" fill={color} opacity="0.8" />
      </svg>
    );
  }
  if (/boost|xgb/i.test(name)) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M12 2L7 10h4l-3 8 9-10h-5l3-6z" fill={color} />
      </svg>
    );
  }
  if (/gb|lightgbm/i.test(name)) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2 L17 10 L10 18 L3 10 Z" fill={color} opacity="0.85" />
        <path d="M10 5 L14 10 L10 15 L6 10 Z" fill="#0a1628" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M2,15 C4,15 4,10 6,10 C8,10 8,5 10,5 C12,5 12,10 14,10 C16,10 16,5 18,5"
        stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

const CrownSVG = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="#fbbf24">
    <path d="M0,16 L0,8 L6,14 L12,0 L18,14 L24,8 L24,16 Z" />
  </svg>
);

const CYCLE_MS = 2000;

function useAnimatedScore(target: number, active: boolean) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(parseFloat((t * target).toFixed(3)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, target]);

  return val;
}

interface DisplayModel {
  name: string;
  score: number;
  color: string;
}

function ModelCard({ model, index, step, winnerIdx, metricLabel }: {
  model: DisplayModel;
  index: number;
  step: number;
  winnerIdx: number;
  metricLabel: string;
}) {
  const isWinner = index === winnerIdx;
  const isDimmed = step >= 3 && !isWinner;
  const showScore = step >= 2;
  const score = useAnimatedScore(model.score, showScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={step >= 1 ? { opacity: isDimmed ? 0.4 : 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.4, delay: step === 1 ? index * 0.3 : 0 }}
      style={{
        background: "#0a1628",
        border: `1px solid ${isWinner && step >= 3 ? "#fbbf24" : model.color + "44"}`,
        borderRadius: 10, padding: "0.75rem", position: "relative",
        boxShadow: isWinner && step >= 3 ? "0 0 20px #fbbf2466" : "none",
        transition: "box-shadow 0.4s, border-color 0.4s",
      }}
    >
      <AnimatePresence>
        {isWinner && step >= 3 && (
          <>
            <motion.div key="crown" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} style={{ position: "absolute", top: -12, right: 8 }}>
              <CrownSVG />
            </motion.div>
            <motion.div key="badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", top: 6, right: 6, background: "#fbbf2422",
                border: "1px solid #fbbf24", borderRadius: 4, padding: "1px 5px",
                fontSize: 8, color: "#fbbf24", fontWeight: 700 }}>
              Winner!
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {iconForModel(model.name, model.color)}
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{model.name}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: model.color, lineHeight: 1 }}>
        {score.toFixed(3)}
      </div>
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{metricLabel}</div>
    </motion.div>
  );
}

interface AutoMLResults {
  models: Array<{ name: string; score: number }>;
  winner: string;
  taskType: "classification" | "regression";
}

export default function AutoMLStory({ active, taskType, automlResults }: {
  active: boolean;
  taskType?: "classification" | "regression";
  automlResults?: AutoMLResults | null;
}) {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayModels: DisplayModel[] =
    automlResults?.models && automlResults.models.length > 0
      ? automlResults.models.slice(0, 4).map((m, i) => ({
          name: m.name,
          score: m.score,
          color: MODEL_COLORS[i % MODEL_COLORS.length],
        }))
      : DEMO_MODELS;

  const winnerName = automlResults?.winner
    ?? displayModels.reduce((best, m) => m.score > best.score ? m : best).name;
  const winnerIdx = Math.max(displayModels.findIndex((m) => m.name === winnerName), 0);

  const effectiveTaskType = automlResults?.taskType ?? taskType ?? "classification";
  const metricLabel = effectiveTaskType === "regression" ? "R² score" : "accuracy";

  useEffect(() => {
    if (!active) { setStep(0); return; }
    timerRef.current = setTimeout(() => {
      setStep((s) => (s >= 4 ? 0 : s + 1));
    }, CYCLE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, step]);

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
        MODEL COMPETITION
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {displayModels.map((m, i) => (
          <ModelCard key={m.name} model={m} index={i} step={step} winnerIdx={winnerIdx} metricLabel={metricLabel} />
        ))}
      </div>

      {/* Ensemble hint */}
      <AnimatePresence>
        {step >= 4 && (
          <motion.div
            key="ensemble-hint"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 12, fontSize: 11, color: "#94a3b8",
              textAlign: "center", lineHeight: 1.5,
            }}
          >
            Combining top 3 models in ensemble
            <span style={{ color: "#34d399", fontWeight: 700 }}> → boost </span>
            <span style={{ color: "#34d399" }}>↑</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
