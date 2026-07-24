"use client";

import { useState } from "react";

function parseNumericCell(cell: string): number | null {
  const cleaned = cell.replace(/[$,%\s]/g, "");
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return parseFloat(cleaned);
}

/** Column indices whose values are mostly real numbers — good candidates to
 * chart. Requires 2+ distinct values so a constant or mostly-blank column
 * doesn't produce a meaningless flat chart. */
export function detectNumericColumns(header: string[], body: string[][]): number[] {
  const numeric: number[] = [];
  header.forEach((_, colIdx) => {
    const values = body.map(r => parseNumericCell(r[colIdx] ?? "")).filter((v): v is number => v !== null);
    if (values.length >= Math.max(2, body.length * 0.6) && new Set(values).size >= 2) {
      numeric.push(colIdx);
    }
  });
  return numeric;
}

type Props = { header: string[]; body: string[][]; accent: string };

export default function RagTableChart({ header, body, accent }: Props) {
  const numericCols = detectNumericColumns(header, body);
  const [col, setCol] = useState(numericCols[0] ?? 0);
  if (numericCols.length === 0) return null;

  // The label column is whichever non-numeric column comes first — usually
  // the row's name/category (e.g. "Widget A"), falling back to column 0
  // when every column happens to be numeric.
  const labelCol = header.findIndex((_, i) => !numericCols.includes(i));
  const effectiveLabelCol = labelCol >= 0 ? labelCol : 0;

  const values = body.map(r => parseNumericCell(r[col] ?? "") ?? 0);
  const labels = body.map(r => r[effectiveLabelCol] ?? "");
  const max = Math.max(...values, 0.0001);

  return (
    <div>
      {numericCols.length > 1 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          {numericCols.map(c => (
            <button key={c} onClick={(e) => { e.stopPropagation(); setCol(c); }}
              style={{
                fontSize: "0.55rem", padding: "1px 6px", borderRadius: 9999, border: "1px solid",
                borderColor: c === col ? `${accent}55` : "rgba(255,255,255,0.12)",
                background: c === col ? `${accent}22` : "transparent",
                color: c === col ? accent : "rgba(255,255,255,0.4)",
                cursor: "pointer",
              }}>
              {header[c]}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100, overflowX: "auto", paddingBottom: 2 }}>
        {values.map((v, i) => (
          <div key={i} title={`${labels[i]}: ${v}`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 28, flexShrink: 0 }}>
            <div style={{ width: 18, height: Math.max(2, (v / max) * 90), background: accent, borderRadius: 2 }} />
            <span style={{
              fontSize: "0.5rem", color: "var(--text3)", marginTop: 2, maxWidth: 34,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}