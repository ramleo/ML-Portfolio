"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CYCLE_MS = 1800;

interface Props {
  active: boolean;
  frozen?: boolean;
  taskType?: "classification" | "regression";
  allCols?: string[];
  keptCols?: string[];
}

export default function FSStory({ active, frozen = false, allCols, keptCols }: Props) {
  const demoFeatures = [
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

  let displayFeatures: Array<{ name: string; score: number; keep: boolean }>;

  if (allCols && allCols.length > 0) {
    const keptSet = new Set(keptCols ?? allCols);
    const kept = allCols.filter(c => keptSet.has(c)).slice(0, 12);
    const dropped = allCols.filter(c => !keptSet.has(c)).slice(0, 5);
    const all = [...kept, ...dropped];
    displayFeatures = all.map((name, i) => ({
      name,
      score: parseFloat((0.95 - i * 0.05).toFixed(2)),
      keep: keptSet.has(name),
    })).slice(0, 17);
  } else {
    displayFeatures = demoFeatures;
  }

  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setStep(keptCols && keptCols.length > 0 ? 3 : 0); return; }
    if (frozen) { if (step !== 3) setStep(3); return; }
    timerRef.current = setTimeout(() => {
      setStep((s) => (s >= 3 ? 0 : s + 1));
    }, CYCLE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, step, frozen, keptCols]);

  const rowH = displayFeatures.length > 10 ? 16 : 22;
  const gap = displayFeatures.length > 10 ? 2 : 4;

  return (
    <div data-frozen={frozen} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap }}>
      {displayFeatures.map((feat, i) => {
        const isDimmed = !feat.keep && step >= 2;
        const isRemoved = !feat.keep && step >= 3;
        const isKept = feat.keep && step >= 3;
        const barColor = isKept ? "#f59e0b" : isDimmed ? "#ef4444" : "#1e3a5f";

        return (
          <motion.div
            key={feat.name}
            animate={isRemoved
              ? { height: 0, opacity: 0, marginBottom: -4 }
              : { height: rowH, opacity: isDimmed ? 0.2 : 1, marginBottom: 0 }
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
              flex: 1, height: rowH - 4, background: "#0a1628",
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

      {/* Badge — below bars so it never overlaps scores */}
      <AnimatePresence>
        {step >= 3 && (
          <motion.div
            key="badge"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              alignSelf: "flex-end", marginTop: 6,
              background: "#f59e0b22", border: "1px solid #f59e0b",
              borderRadius: 6, padding: "2px 8px",
              fontSize: 9, color: "#f59e0b", fontWeight: 700,
            }}
          >
            {displayFeatures.filter(f => f.keep).length} / {displayFeatures.length} features kept
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}