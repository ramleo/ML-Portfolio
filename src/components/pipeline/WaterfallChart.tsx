"use client";

import { motion } from "framer-motion";

interface Stage {
  id: string;
  label: string;
  scoreDelta: number;
  accent: string;
}

interface WaterfallChartProps {
  stages: Stage[];
}

export default function WaterfallChart({ stages }: WaterfallChartProps) {
  if (!stages.length || stages.every((s) => s.scoreDelta === 0)) return null;

  const maxDelta = Math.max(...stages.map((s) => s.scoreDelta), 1);
  const cumulative = stages.reduce((sum, s) => sum + s.scoreDelta, 0);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
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
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "rgba(200,205,225,0.9)",
          }}
        >
          {cumulative >= 0 ? "+" : ""}
          {cumulative.toFixed(2)}
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {stages.map((stage, index) => {
          const barWidth = Math.max(4, (stage.scoreDelta / maxDelta) * 100);
          return (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
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
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  style={{
                    height: "100%",
                    background: stage.accent,
                    borderRadius: 4,
                  }}
                />
              </div>

              {/* Delta value */}
              <span
                style={{
                  minWidth: 60,
                  textAlign: "right",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: stage.accent,
                }}
              >
                +{stage.scoreDelta.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
