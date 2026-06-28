"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
  { name: "Age×Fare",      score: 0.92, keep: true  },
  { name: "Fare",          score: 0.87, keep: true  },
  { name: "Age",           score: 0.79, keep: true  },
  { name: "Pclass",        score: 0.74, keep: true  },
  { name: "Age_log1p",     score: 0.68, keep: true  },
  { name: "Sex_encoded",   score: 0.61, keep: true  },
  { name: "Embarked_S",    score: 0.38, keep: false },
  { name: "Embarked_C",    score: 0.29, keep: false },
  { name: "Fare_sqrt",     score: 0.21, keep: false },
  { name: "Cabin_missing", score: 0.08, keep: false },
];

const CYCLE_MS = 1800;

export default function FSStory({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    timerRef.current = setTimeout(() => {
      setStep((s) => (s >= 3 ? 0 : s + 1));
    }, CYCLE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, step]);

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
      {/* Badge */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            key="badge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "#f59e0b22", border: "1px solid #f59e0b",
              borderRadius: 6, padding: "2px 8px",
              fontSize: 9, color: "#f59e0b", fontWeight: 700,
            }}
          >
            6 / 10 features kept
          </motion.div>
        )}
      </AnimatePresence>

      {FEATURES.map((feat, i) => {
        const isDimmed = !feat.keep && step >= 2;
        const isRemoved = !feat.keep && step >= 3;
        const isKept = feat.keep && step >= 3;
        const barColor = isKept ? "#f59e0b" : isDimmed ? "#ef4444" : "#1e3a5f";

        return (
          <motion.div
            key={feat.name}
            animate={isRemoved
              ? { height: 0, opacity: 0, marginBottom: -4 }
              : { height: 22, opacity: isDimmed ? 0.2 : 1, marginBottom: 0 }
            }
            transition={{ duration: 0.4, delay: isRemoved ? i * 0.04 : 0 }}
            style={{ overflow: "hidden", display: "flex", alignItems: "center", gap: 8 }}
          >
            {/* Label */}
            <div style={{
              width: 110, fontSize: 10, color: "#94a3b8",
              textAlign: "right", flexShrink: 0,
              textDecoration: isDimmed ? "line-through" : "none",
            }}>
              {feat.name}
            </div>

            {/* Bar track */}
            <div style={{
              flex: 1, height: 14, background: "#0a1628",
              borderRadius: 4, overflow: "hidden", position: "relative",
            }}>
              {/* Threshold line */}
              {step >= 2 && (
                <div style={{
                  position: "absolute", left: "50%", top: 0, bottom: 0,
                  width: 1, borderLeft: "1px dashed #ef4444", zIndex: 2,
                }}>
                  {i === 0 && (
                    <span style={{
                      position: "absolute", top: -14, left: 3,
                      fontSize: 8, color: "#ef4444", whiteSpace: "nowrap",
                    }}>
                      threshold
                    </span>
                  )}
                </div>
              )}
              <motion.div
                animate={{
                  width: step >= 1 ? `${feat.score * 100}%` : `${feat.score * 100}%`,
                  backgroundColor: barColor,
                  boxShadow: isKept ? "0 0 8px #f59e0b88" : "none",
                }}
                initial={{ width: 0, backgroundColor: "#1e3a5f" }}
                transition={{ duration: 0.6, delay: step === 0 ? i * 0.07 : 0 }}
                style={{ height: "100%", borderRadius: 4 }}
              />
            </div>

            {/* Score label */}
            <motion.div
              animate={{ opacity: step >= 1 ? 1 : 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{ width: 36, fontSize: 10, color: "#64748b", textAlign: "right" }}
            >
              {feat.score.toFixed(2)}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}