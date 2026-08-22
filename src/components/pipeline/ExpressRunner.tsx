"use client";

import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  { id: "preprocessing",   label: "Preprocess",     accent: "#38bdf8" },
  { id: "feature-eng",     label: "Feature Eng",    accent: "#f59e0b" },
  { id: "feature-select",  label: "Feature Select", accent: "#34d399" },
  { id: "automl",          label: "AutoML",         accent: "#22c55e" },
];

interface Props {
  runningStage: string | null;
  completedStages: string[];
}

export default function ExpressRunner({ runningStage, completedStages }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.id === runningStage);

  return (
    <AnimatePresence>
      {runningStage && (
        <motion.div
          key="express-runner"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.35 }}
          style={{ overflow: "hidden", marginBottom: "1.5rem" }}
        >
          <div style={{
            position: "relative", overflow: "hidden",
            background: "var(--bg-glass)",
            border: "1px solid rgba(56,189,248,0.18)",
            borderRadius: 12, padding: "1.1rem 1.5rem",
          }}>
            {/* Scan-line sweep */}
            <motion.div
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", top: 0, left: 0, width: "35%", height: "100%",
                background: "linear-gradient(90deg,transparent,rgba(56,189,248,0.05),transparent)",
                pointerEvents: "none",
              }}
            />

            <div style={{
              fontSize: "0.68rem", letterSpacing: "0.12em",
              color: "rgba(56,189,248,0.6)", fontWeight: 700,
              marginBottom: "1rem", fontFamily: "monospace",
            }}>
              EXPRESS PIPELINE — RUNNING
            </div>

            {/* Stage nodes + connectors */}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {STAGES.map((stage, i) => {
                const isDone    = completedStages.includes(stage.id);
                const isRunning = stage.id === runningStage;
                const isPending = !isDone && !isRunning;

                return (
                  <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : 0 }}>
                    {/* Node */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem" }}>
                      <div style={{ position: "relative", width: 30, height: 30 }}>
                        {/* Pulse ring when running */}
                        {isRunning && (
                          <motion.div
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                            style={{
                              position: "absolute", inset: 0, borderRadius: "50%",
                              background: stage.accent, pointerEvents: "none",
                            }}
                          />
                        )}
                        <motion.div
                          animate={isRunning ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 0.9, repeat: Infinity }}
                          style={{
                            width: 30, height: 30, borderRadius: "50%", position: "relative", zIndex: 1,
                            background: isDone ? stage.accent : isRunning ? `${stage.accent}22` : "var(--border)",
                            border: `2px solid ${isDone || isRunning ? stage.accent : "var(--border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "background 0.3s, border-color 0.3s",
                            boxShadow: isRunning ? `0 0 14px ${stage.accent}55` : "none",
                          }}
                        >
                          {isDone && (
                            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {isRunning && (
                            <motion.div
                              animate={{ scale: [0.4, 0.9, 0.4] }}
                              transition={{ duration: 0.7, repeat: Infinity }}
                              style={{ width: 9, height: 9, borderRadius: "50%", background: stage.accent }}
                            />
                          )}
                          {isPending && (
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--border2)" }} />
                          )}
                        </motion.div>
                      </div>

                      <span style={{
                        fontSize: "0.67rem", whiteSpace: "nowrap", fontWeight: isDone || isRunning ? 600 : 400,
                        color: isDone ? stage.accent : isRunning ? "var(--text)" : "var(--text3)",
                        transition: "color 0.3s",
                      }}>
                        {stage.label}
                      </span>
                    </div>

                    {/* Connector line */}
                    {i < STAGES.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, margin: "0 0.5rem", marginBottom: "1.35rem",
                        background: "var(--border)", position: "relative", overflow: "hidden",
                        borderRadius: 2,
                      }}>
                        {/* Fill when stage done */}
                        {(isDone || currentIdx > i) && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            style={{ height: "100%", background: stage.accent, borderRadius: 2 }}
                          />
                        )}
                        {/* Traveling beam on currently running connector */}
                        {currentIdx === i && (
                          <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                            style={{
                              position: "absolute", top: 0, left: 0, width: "45%", height: "100%",
                              background: `linear-gradient(90deg,transparent,${stage.accent},transparent)`,
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}