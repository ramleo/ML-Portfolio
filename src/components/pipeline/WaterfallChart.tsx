"use client";

import { motion } from "framer-motion";
import type { WaterfallStage } from "./pipeline-types";

interface WaterfallChartProps {
  stages: WaterfallStage[];
}

function DeltaLabel({ value, unit }: { value: number; unit: string }) {
  const positive = value >= 0;
  return (
    <span style={{ color: positive ? "#4ade80" : "#f87171", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
      {positive ? "+" : ""}{value}{unit ? ` ${unit}` : ""}
    </span>
  );
}

export default function WaterfallChart({ stages }: WaterfallChartProps) {
  if (!stages.length) return null;

  const scoreStages = stages.filter((s) => s.scoreDelta !== undefined && s.scoreDelta !== 0);
  const maxScore = scoreStages.length
    ? Math.max(...scoreStages.map((s) => Math.abs(s.scoreDelta!)), 1)
    : 1;

  return (
    <div
      style={{
        background: "rgba(13,17,28,0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        marginTop: "2rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(200,205,225,0.55)",
          }}
        >
          Stage Impact
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {stages.map((stage, index) => {
          const hasScore = stage.scoreDelta !== undefined && stage.scoreDelta !== 0;
          const hasRowCol = stage.rowDelta !== undefined || stage.colDelta !== undefined;

          let barWidth: number;
          if (hasScore) {
            barWidth = Math.max(4, (Math.abs(stage.scoreDelta!) / maxScore) * 100);
          } else if (hasRowCol) {
            barWidth = stage.colsBefore !== undefined ? 25 : 30;
          } else {
            barWidth = 10;
          }

          return (
            <div
              key={stage.id}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              {/* Label */}
              <span
                style={{
                  minWidth: 140,
                  fontSize: "0.82rem",
                  color: "rgba(200,205,225,0.75)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stage.label}
              </span>

              {/* Bar track */}
              <div
                style={{
                  flex: 1,
                  height: 20,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                  style={{ height: "100%", background: stage.accent, borderRadius: 4 }}
                />
              </div>

              {/* Value label */}
              <div
                style={{
                  minWidth: 130,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "0.15rem",
                }}
              >
                {hasScore ? (
                  <DeltaLabel value={stage.scoreDelta!} unit={stage.scoreUnit ?? ""} />
                ) : stage.rowsBefore !== undefined || stage.colsBefore !== undefined ? (
                  <>
                    {stage.rowsBefore !== undefined && (
                      <span style={{ fontSize: "0.72rem", whiteSpace: "nowrap", color: stage.rowsAfter !== stage.rowsBefore ? stage.accent : "rgba(200,205,225,0.45)" }}>
                        {stage.rowsAfter} rows{stage.rowsAfter !== stage.rowsBefore ? ` (${stage.rowDelta! > 0 ? "+" : ""}${stage.rowDelta})` : " (no change)"}
                      </span>
                    )}
                    {stage.colsBefore !== undefined && (
                      <span style={{ fontSize: "0.72rem", whiteSpace: "nowrap", color: stage.colsAfter !== stage.colsBefore ? stage.accent : "rgba(200,205,225,0.45)" }}>
                        {stage.colsAfter} cols{stage.colsAfter !== stage.colsBefore ? ` (${stage.colDelta! > 0 ? "+" : ""}${stage.colDelta})` : " (no change)"}
                      </span>
                    )}
                  </>
                ) : hasRowCol ? (
                  <>
                    {stage.rowDelta !== undefined && stage.rowDelta !== 0 && (
                      <DeltaLabel value={stage.rowDelta} unit="rows" />
                    )}
                    {stage.colDelta !== undefined && stage.colDelta !== 0 && (
                      <DeltaLabel value={stage.colDelta} unit="cols" />
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: "0.78rem", color: "rgba(200,205,225,0.4)" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
