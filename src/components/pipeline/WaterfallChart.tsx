"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { WaterfallStage } from "./pipeline-types";

interface WaterfallChartProps {
  stages: WaterfallStage[];
}

const METRIC_MAP: Record<string, string> = {
  neg_mean_absolute_error: "MAE",
  neg_root_mean_squared_error: "RMSE",
  neg_mean_squared_error: "MSE",
  neg_mean_absolute_percentage_error: "MAPE",
  r2: "R²",
  accuracy: "Accuracy",
  f1: "F1",
  roc_auc: "AUC-ROC",
  f1_weighted: "F1 (weighted)",
  f1_macro: "F1 (macro)",
  precision: "Precision",
  recall: "Recall",
};

function fmtMetric(m: string) {
  return METRIC_MAP[m] ?? m.replace(/^neg_/i, "").replace(/_/g, " ");
}

function useTypewriter(text: string, charDelay = 45) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, charDelay);
    return () => clearInterval(t);
  }, [text, charDelay]);
  return shown;
}

function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (target === from) return;
    const steps = Math.ceil(duration / 16);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const eased = 1 - Math.pow(1 - i / steps, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (i >= steps) { clearInterval(timer); setVal(target); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}

const MUTED = "rgba(200,205,225,0.38)";
const MUTED_SM: React.CSSProperties = { fontSize: "0.65rem", color: MUTED, fontWeight: 400 };

function RowLabel({ stage }: { stage: WaterfallStage }) {
  if (stage.scoreDelta !== undefined && stage.scoreDelta !== 0) {
    const isErr = (stage.scoreUnit ?? "").startsWith("neg_");
    const displayVal = isErr ? Math.abs(stage.scoreDelta) : stage.scoreDelta;
    const pos = stage.scoreDelta >= 0;
    return (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ color: pos ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: "0.85rem" }}>
          {!isErr && (pos ? "+" : "")}{displayVal}
        </span>
        <span style={MUTED_SM}>{fmtMetric(stage.scoreUnit ?? "")}</span>
      </span>
    );
  }

  if (stage.rowsBefore !== undefined || stage.colsBefore !== undefined) {
    const rowChanged = stage.rowsBefore !== undefined && stage.rowsAfter !== stage.rowsBefore;
    const colChanged = stage.colsBefore !== undefined && stage.colsAfter !== stage.colsBefore;

    return (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.22rem" }}>
        {stage.rowsBefore !== undefined && (
          <span style={{ fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap", color: rowChanged ? stage.accent : "rgba(200,205,225,0.6)" }}>
            {rowChanged ? (
              <>{stage.rowsBefore}<span style={{ opacity: 0.45 }}> → </span><CountUp value={stage.rowsAfter!} /> rows
                <span style={{ ...MUTED_SM, marginLeft: 4 }}>({stage.rowDelta! > 0 ? "+" : ""}{stage.rowDelta})</span>
              </>
            ) : (
              <><CountUp value={stage.rowsAfter ?? stage.rowsBefore} /> rows
                <span style={{ ...MUTED_SM, marginLeft: 4 }}>(no change)</span>
              </>
            )}
          </span>
        )}
        {stage.colsBefore !== undefined && (
          <span style={{ fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap", color: colChanged ? stage.accent : "rgba(200,205,225,0.6)" }}>
            {colChanged ? (
              <>{stage.colsBefore}<span style={{ opacity: 0.45 }}> → </span><CountUp value={stage.colsAfter!} /> cols
                <span style={{ ...MUTED_SM, marginLeft: 4 }}>({stage.colDelta! > 0 ? "+" : ""}{stage.colDelta})</span>
              </>
            ) : (
              <><CountUp value={stage.colsAfter ?? stage.colsBefore} /> cols
                <span style={{ ...MUTED_SM, marginLeft: 4 }}>(no change)</span>
              </>
            )}
          </span>
        )}
      </span>
    );
  }

  return <span style={{ fontSize: "0.78rem", color: "rgba(200,205,225,0.25)" }}>—</span>;
}

export default function WaterfallChart({ stages }: WaterfallChartProps) {
  if (!stages.length) return null;

  const header = useTypewriter("STAGE IMPACT");

  const scoreStages = stages.filter((s) => s.scoreDelta !== undefined && s.scoreDelta !== 0);
  const maxScore = scoreStages.length
    ? Math.max(...scoreStages.map((s) => Math.abs(s.scoreDelta!)), 1)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ background: "rgba(13,17,28,0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem 1.5rem", marginTop: "2rem" }}
    >
      {/* Header with typewriter + accent underline */}
      <div style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.55rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(200,205,225,0.7)", fontFamily: "monospace" }}>
            {header}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ marginLeft: 2, borderRight: "2px solid rgba(200,205,225,0.5)", display: "inline-block", height: "0.85em", verticalAlign: "middle" }}
            />
          </span>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,205,225,0.28)" }}>
            output
          </span>
        </div>
        {/* Accent underline — animates width in after typewriter */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: "STAGE IMPACT".length * 0.045 + 0.1, duration: 0.5, ease: "easeOut" }}
          style={{ height: 1, background: "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(168,139,250,0.3), transparent)" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <AnimatePresence>
          {stages.map((stage, index) => {
            const hasScore = stage.scoreDelta !== undefined && stage.scoreDelta !== 0;
            const hasRowCol = stage.rowDelta !== undefined || stage.colDelta !== undefined;
            let barWidth: number;
            if (hasScore) barWidth = Math.max(4, (Math.abs(stage.scoreDelta!) / maxScore) * 100);
            else if (hasRowCol) barWidth = stage.colsBefore !== undefined ? 25 : 30;
            else barWidth = 10;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ delay: index * 0.07, duration: 0.32, ease: "easeOut" }}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
              >
                <span style={{ minWidth: 140, fontSize: "0.82rem", color: "rgba(200,205,225,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage.label}
                </span>

                <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ delay: index * 0.07 + 0.12, duration: 0.5, ease: "easeOut" }}
                    style={{ height: "100%", background: stage.accent, borderRadius: 4 }}
                  />
                  <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.8 }}
                    style={{ position: "absolute", inset: 0, background: `${stage.accent}35`, borderRadius: 4, pointerEvents: "none" }}
                  />
                </div>

                <div style={{ minWidth: 130, display: "flex", justifyContent: "flex-end" }}>
                  <RowLabel stage={stage} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}