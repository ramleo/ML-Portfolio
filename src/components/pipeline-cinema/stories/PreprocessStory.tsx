"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PreprocessStory({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setStep((s) => (s >= 5 ? 0 : s + 1));
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) setStep(0);
  }, [active]);

  const badges: Record<number, { label: string; color: string }> = {
    0: { label: "RAW DATA", color: "#64748b" },
    1: { label: "IMPUTING", color: "#22d3ee" },
    2: { label: "DEDUP", color: "#fbbf24" },
    3: { label: "OUTLIERS", color: "#f97316" },
    4: { label: "SKEWNESS", color: "#a78bfa" },
    5: { label: "CLEAN ✓", color: "#34d399" },
  };

  const badge = badges[step];

  // Cell state helpers
  const nanStyle = { background: "rgba(239,68,68,0.25)", color: "#fca5a5" };
  const filledStyle = { background: "rgba(34,211,238,0.25)", color: "#67e8f9" };
  const dupStyle = { background: "rgba(251,191,36,0.2)", color: "#fde68a" };
  const outlierStyle = { background: "rgba(249,115,22,0.25)", color: "#fdba74" };
  const normal = {};

  const row1Cabin = step >= 1 ? { val: "C23", style: step === 1 ? filledStyle : normal } : { val: "NaN", style: nanStyle };
  const row2Age = step >= 1 ? { val: "30", style: step === 1 ? filledStyle : normal } : { val: "NaN", style: nanStyle };
  const row3Cabin = step >= 1 ? { val: "C23", style: step === 1 ? filledStyle : normal } : { val: "NaN", style: nanStyle };

  const fareVal = step >= 3 ? "262.00" : step === 3 ? "512.33" : "71.83";
  const fareR4Style = step === 3 ? outlierStyle : normal;

  const skewBars = [40, 30, 15, 8, 5, 2];
  const normalBars = [5, 15, 30, 30, 15, 5];
  const bars = step >= 4 ? normalBars : skewBars;

  const showRow5 = step < 2;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 8, padding: "1rem", position: "relative", overflow: "hidden" }}>
      {/* Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <motion.span
          key={step}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: `${badge.color}22`,
            border: `1px solid ${badge.color}`,
            color: badge.color,
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          {badge.label}
        </motion.span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ fontSize: 11, borderCollapse: "collapse", width: "100%", color: "#e2e8f0" }}>
          <thead>
            <tr>
              {["#", "Age", "Fare", "Cabin", "Embarked", "Sex"].map((h) => (
                <th key={h} style={{ background: "#0f2744", color: "#64748b", padding: "4px 8px", fontWeight: 700, fontSize: 10, textAlign: "left" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Row 1 */}
            <tr>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", color: "#475569", fontSize: 10 }}>1</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>22</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>7.25</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", transition: "background 0.4s", ...row1Cabin.style }}>{row1Cabin.val}</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>S</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>male</td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", color: "#475569", fontSize: 10 }}>2</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", transition: "background 0.4s", ...row2Age.style }}>{row2Age.val}</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>71.83</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C85</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>female</td>
            </tr>
            {/* Row 3 */}
            <tr>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", color: "#475569", fontSize: 10 }}>3</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>26</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>7.92</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", transition: "background 0.4s", ...row3Cabin.style }}>{row3Cabin.val}</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>S</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>male</td>
            </tr>
            {/* Row 4 — outlier fare */}
            <tr>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", color: "#475569", fontSize: 10 }}>4</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>35</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", transition: "background 0.4s", ...fareR4Style }}>
                {step === 3 ? "512.33" : step > 3 ? "262.00" : "71.83"}
                {step === 3 && <span style={{ fontSize: 9, color: "#fb923c", marginLeft: 4 }}>clipped ↓</span>}
              </td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C85</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C</td>
              <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>female</td>
            </tr>
            {/* Row 5 — duplicate, removed at step 2 */}
            <AnimatePresence>
              {showRow5 && (
                <motion.tr
                  key="row5"
                  initial={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ background: step >= 1 ? "rgba(251,191,36,0.2)" : "transparent", color: step >= 1 ? "#fde68a" : "inherit", overflow: "hidden" }}
                >
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744", color: "#475569", fontSize: 10 }}>5</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>35</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>71.83</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C85</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>C</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #0f2744" }}>female</td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Skewness mini bar chart */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32, paddingLeft: 8 }}>
          <span style={{ fontSize: 9, color: "#a78bfa", marginRight: 4, alignSelf: "center" }}>Fare dist:</span>
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: skewBars[i] * 0.6 }}
              animate={{ height: h * 0.6 }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              style={{ width: 10, background: "#a78bfa", borderRadius: 2, alignSelf: "flex-end" }}
            />
          ))}
        </motion.div>
      )}

      {/* Done overlay */}
      <AnimatePresence>
        {step === 5 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,14,32,0.7)", borderRadius: 8 }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, color: "#34d399" }}>✓</div>
              <div style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>Data Clean</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}