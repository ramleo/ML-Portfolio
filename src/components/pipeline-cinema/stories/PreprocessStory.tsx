"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PreprocessStoryProps {
  active: boolean;
  taskType?: "classification" | "regression";
  csvPreviewCols?: string[];
  csvPreviewRows?: string[][];
}

export default function PreprocessStory({ active, csvPreviewCols, csvPreviewRows }: PreprocessStoryProps) {
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
  const outlierStyle = { background: "rgba(249,115,22,0.25)", color: "#fdba74" };
  const normal = {};

  // Use real CSV data if provided, otherwise fall back to demo data
  const demoCols = ["#", "Age", "Fare", "Cabin", "Embarked", "Sex"];
  const demoRows = [
    ["1", "22", "7.25", "C23", "S", "male"],
    ["2", "—", "71.83", "C85", "C", "female"],
    ["3", "26", "7.92", "C23", "S", "male"],
    ["4", "35", "71.83", "C85", "C", "female"],
    ["5", "35", "71.83", "C85", "C", "female"],
  ];

  const tableCols = csvPreviewCols && csvPreviewCols.length > 0
    ? ["#", ...csvPreviewCols.slice(0, 5)]
    : demoCols;

  const tableRows = csvPreviewRows && csvPreviewRows.length > 0
    ? csvPreviewRows.slice(0, 5).map((row, i) => [String(i + 1), ...row.slice(0, 5)])
    : demoRows;

  // Animated cell indices (impute col 2, col 3; outlier col 2 row 3)
  const imputeCol = 2; // index into tableRows[i] to show as NaN -> filled
  const imputeRow2Col = 1; // second imputed cell in row 1

  const cell = (rowIdx: number, colIdx: number, step: number) => {
    const val = tableRows[rowIdx]?.[colIdx] ?? "—";
    // Impute animation: rows 0 and 2, col imputeCol
    if ((rowIdx === 0 || rowIdx === 2) && colIdx === imputeCol) {
      if (step < 1) return { val: "NaN", style: nanStyle };
      return { val, style: step === 1 ? filledStyle : normal };
    }
    // Second impute: row 1, col imputeRow2Col
    if (rowIdx === 1 && colIdx === imputeRow2Col) {
      if (step < 1) return { val: "NaN", style: nanStyle };
      return { val, style: step === 1 ? filledStyle : normal };
    }
    // Outlier: row 3, col 2
    if (rowIdx === 3 && colIdx === 2) {
      if (step === 3) return { val: "outlier↑", style: outlierStyle };
      return { val, style: normal };
    }
    return { val, style: normal };
  };

  const skewBars = [40, 30, 15, 8, 5, 2];
  const normalBars = [5, 15, 30, 30, 15, 5];
  const bars = step >= 4 ? normalBars : skewBars;

  const showRow5 = step < 2 && tableRows.length >= 5;

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
        <table style={{ fontSize: 11, borderCollapse: "collapse", width: "100%", color: "var(--text)" }}>
          <thead>
            <tr>
              {tableCols.map((h) => (
                <th key={h} style={{ background: "var(--border2)", color: "var(--text3)", padding: "4px 8px", fontWeight: 700, fontSize: 10, textAlign: "left" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rows 0-3 always shown */}
            {tableRows.slice(0, 4).map((row, rowIdx) => (
              <tr key={rowIdx}>
                {tableCols.map((_, colIdx) => {
                  const { val, style } = cell(rowIdx, colIdx, step);
                  const isRowNum = colIdx === 0;
                  const isOutlierCell = rowIdx === 3 && colIdx === 2 && step === 3;
                  return (
                    <td
                      key={colIdx}
                      style={{
                        padding: "3px 8px",
                        borderBottom: "1px solid var(--border2)",
                        transition: "background 0.4s",
                        color: isRowNum ? "var(--text3)" : undefined,
                        fontSize: isRowNum ? 10 : undefined,
                        ...style,
                      }}
                    >
                      {val}
                      {isOutlierCell && <span style={{ fontSize: 9, color: "#fb923c", marginLeft: 4 }}>clipped ↓</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
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
                  {tableCols.map((_, colIdx) => (
                    <td key={colIdx} style={{ padding: "3px 8px", borderBottom: "1px solid var(--border2)", color: colIdx === 0 ? "var(--text3)" : undefined, fontSize: colIdx === 0 ? 10 : undefined }}>
                      {tableRows[4]?.[colIdx] ?? "—"}
                    </td>
                  ))}
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
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--bg) 70%, transparent)", borderRadius: 8 }}
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