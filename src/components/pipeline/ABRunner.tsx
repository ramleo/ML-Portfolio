"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  abRunning: boolean;
}

const AB_STAGES = [
  { id: "preprocessing",  label: "Preprocess" },
  { id: "feature-eng",    label: "Feature Eng" },
  { id: "feature-select", label: "Feature Select" },
  { id: "automl",         label: "AutoML" },
];

const ACCENT_A = "#38bdf8";
const ACCENT_B = "#a78bfa";

function CheckSVG() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface PipelineTrackProps {
  label: string;
  accent: string;
  /** simStep: 0–3 maps to stages for pipeline A; 4–7 maps for pipeline B */
  simStep: number;
  /** offset: 0 for pipeline A, 4 for pipeline B */
  offset: number;
}

function PipelineTrack({ label, accent, simStep, offset }: PipelineTrackProps) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
        color: accent, marginBottom: "0.65rem", fontFamily: "monospace",
        textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {AB_STAGES.map((stage, i) => {
          const isDone    = simStep > i + offset;
          const isRunning = simStep === i + offset;
          const isPending = !isDone && !isRunning;

          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: i < AB_STAGES.length - 1 ? 1 : 0 }}>
              {/* Node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                <div style={{ position: "relative", width: 28, height: 28 }}>
                  {/* Pulse ring */}
                  {isRunning && (
                    <motion.div
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: accent, pointerEvents: "none",
                      }}
                    />
                  )}
                  {/* Inner circle */}
                  <motion.div
                    animate={isRunning ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", position: "relative", zIndex: 1,
                      background: isDone ? accent : isRunning ? `${accent}22` : "rgba(255,255,255,0.05)",
                      border: `2px solid ${isDone || isRunning ? accent : "rgba(255,255,255,0.1)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.3s, border-color 0.3s",
                      boxShadow: isRunning ? `0 0 12px ${accent}55` : "none",
                    }}
                  >
                    {isDone && <CheckSVG />}
                    {isRunning && (
                      <motion.div
                        animate={{ scale: [0.4, 0.9, 0.4] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                        style={{ width: 8, height: 8, borderRadius: "50%", background: accent }}
                      />
                    )}
                    {isPending && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
                    )}
                  </motion.div>
                </div>

                <span style={{
                  fontSize: "0.62rem", whiteSpace: "nowrap",
                  fontWeight: isDone || isRunning ? 600 : 400,
                  color: isDone ? accent : isRunning ? "rgba(220,230,250,0.9)" : "rgba(200,210,230,0.28)",
                  transition: "color 0.3s",
                }}>
                  {stage.label}
                </span>
              </div>

              {/* Connector */}
              {i < AB_STAGES.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: "0 0.4rem", marginBottom: "1.25rem",
                  background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden",
                  borderRadius: 2,
                }}>
                  {isDone && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      style={{ height: "100%", background: accent, borderRadius: 2 }}
                    />
                  )}
                  {isRunning && (
                    <motion.div
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                      style={{
                        position: "absolute", top: 0, left: 0, width: "45%", height: "100%",
                        background: `linear-gradient(90deg,transparent,${accent},transparent)`,
                        borderRadius: 2,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ABRunner({ abRunning }: Props) {
  const [simStep, setSimStep] = useState(0);

  useEffect(() => {
    if (!abRunning) {
      setSimStep(0);
      return;
    }
    setSimStep(0);
    const id = setInterval(() => {
      setSimStep((s) => (s < 8 ? s + 1 : 8));
    }, 900);
    return () => clearInterval(id);
  }, [abRunning]);

  return (
    <AnimatePresence>
      {abRunning && (
        <motion.div
          key="ab-runner"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.35 }}
          style={{ overflow: "hidden", marginBottom: "1.5rem" }}
        >
          <div style={{
            position: "relative", overflow: "hidden",
            background: "rgba(13,17,28,0.92)",
            border: "1px solid rgba(167,139,250,0.18)",
            borderRadius: 12, padding: "1.1rem 1.5rem",
          }}>
            {/* Scan-line sweep */}
            <motion.div
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", top: 0, left: 0, width: "35%", height: "100%",
                background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.05),transparent)",
                pointerEvents: "none",
              }}
            />

            <div style={{
              fontSize: "0.68rem", letterSpacing: "0.12em",
              color: "rgba(167,139,250,0.6)", fontWeight: 700,
              marginBottom: "1.1rem", fontFamily: "monospace",
            }}>
              A/B PIPELINE COMPARISON — RUNNING
            </div>

            <div style={{ display: "flex", gap: "2rem" }}>
              {/* Pipeline A: stages done when simStep > i (offset 0) */}
              <PipelineTrack label="Pipeline A" accent={ACCENT_A} simStep={simStep} offset={0} />

              {/* Divider */}
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0, alignSelf: "stretch" }} />

              {/* Pipeline B: stages done when simStep > i + 4 (offset 4) */}
              <PipelineTrack label="Pipeline B" accent={ACCENT_B} simStep={simStep} offset={4} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}