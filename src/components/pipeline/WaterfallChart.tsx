"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { WaterfallStage } from "./pipeline-types";

interface WaterfallChartProps {
  stages: WaterfallStage[];
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

function RowLabel({ stage }: { stage: WaterfallStage }) {
  if (stage.scoreDelta !== undefined && stage.scoreDelta !== 0) {
    const pos = stage.scoreDelta >= 0;
    return (
      <span style={{ color: pos ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
        {pos ? "+" : ""}{stage.scoreDelta} {stage.scoreUnit ?? ""}
      </span>
    );
  }

  if (stage.rowsBefore !== undefined || stage.colsBefore !== undefined) {
    const rowChanged = stage.rowsBefore !== undefined && stage.rowsAfter !== stage.rowsBefore;
    const colChanged = stage.colsBefore !== undefined && stage.colsAfter !== stage.colsBefore;

    return (
      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", whiteSpace: "nowrap", fontWeight: 600 }}>
        {stage.rowsBefore !== undefined && (
          <span style={{ color: rowChanged ? stage.accent : "rgba(200,205,225,0.45)" }}>
            <CountUp value={stage.rowsAfter ?? stage.rowsBefore} /> rows
            {rowChanged && <span style={{ opacity: 0.8 }}> ({stage.rowDelta! > 0 ? "+" : ""}{stage.rowDelta})</span>}
          </span>
        )}
        {stage.rowsBefore !== undefined && stage.colsBefore !== undefined && (
          <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.6rem" }}>·</span>
        )}
        {stage.colsBefore !== undefined && (
          <span style={{ color: colChanged ? stage.accent : "rgba(200,205,225,0.45)" }}>
            <CountUp value={stage.colsAfter ?? stage.colsBefore} /> cols
            {colChanged && <span style={{ opacity: 0.8 }}> ({stage.colDelta! > 0 ? "+" : ""}{stage.colDelta})</span>}
          </span>
        )}
      </span>
    );
  }

  return <span style={{ fontSize: "0.78rem", color: "rgba(200,205,225,0.3)" }}>—</span>;
}

export default function WaterfallChart({ stages }: WaterfallChartProps) {
  if (!stages.length) return null;

  const scoreStages = stages.filter((s) => s.scoreDelta !== undefined && s.scoreDelta !== 0);
  const maxScore = scoreStages.length
    ? Math.max(...scoreStages.map((s) => Math.abs(s.scoreDelta!)), 1)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        background: "rgba(13,17,28,0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        marginTop: "2rem",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        style={{ marginBottom: "1.25rem" }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,205,225,0.55)" }}>
          Stage Impact
        </span>
      </motion.div>

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
                  {/* arrival glow flash */}
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