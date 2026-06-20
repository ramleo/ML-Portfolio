"use client";

import { useState } from "react";
import type { ColInfo } from "@/lib/fsAlgorithms";
import { pearson } from "@/lib/fsAlgorithms";

interface Props {
  cols: ColInfo[];
  accent?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function cellColor(r: number, accent: string): string {
  if (r >= 0) {
    const [ar, ag, ab] = hexToRgb(accent);
    return `rgba(${ar},${ag},${ab},${(r * 0.8 + 0.05).toFixed(2)})`;
  } else {
    const t = Math.abs(r);
    return `rgba(59,130,246,${(t * 0.8 + 0.05).toFixed(2)})`;
  }
}

export default function CorrelationHeatmap({ cols, accent = "#fb923c" }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  if (cols.length < 2) return null;

  const displayed = cols.slice(0, 20);
  const clipped = cols.length > 20;
  const n = displayed.length;
  const cellSize = Math.min(Math.floor(520 / n), 48);
  const labelW = 90;
  const totalW = labelW + n * cellSize;

  // Compute correlation matrix
  const matrix: number[][] = Array(n).fill(0).map((_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : pearson(displayed[i].nums, displayed[j].nums))
  );

  return (
    <div>
      {clipped && (
        <div style={{ fontSize: "0.7rem", color: "#fbbf24", marginBottom: "0.5rem" }}>
          Showing first 20 of {cols.length} features
        </div>
      )}

      <div style={{ overflowX: "auto", position: "relative" }}
        onMouseLeave={() => setTooltip(null)}>

        <svg
          width={totalW}
          height={labelW + n * cellSize + 8}
          style={{ display: "block", minWidth: totalW }}
        >
          {/* Rotated column headers */}
          {displayed.map((col, j) => (
            <g key={`ch-${j}`} transform={`translate(${labelW + j * cellSize + cellSize / 2}, ${labelW - 4})`}>
              <text
                transform="rotate(-45)"
                textAnchor="start"
                fontSize={Math.min(10, cellSize * 0.55)}
                fill="var(--text3, #9ca3af)"
                style={{ userSelect: "none" }}
              >
                {col.name.length > 10 ? col.name.slice(0, 10) + "…" : col.name}
              </text>
            </g>
          ))}

          {/* Row headers + cells */}
          {displayed.map((rowCol, i) => (
            <g key={`row-${i}`} transform={`translate(0, ${labelW + i * cellSize})`}>
              <text
                x={labelW - 6}
                y={cellSize / 2 + 4}
                textAnchor="end"
                fontSize={Math.min(10, cellSize * 0.55)}
                fill="var(--text3, #9ca3af)"
                style={{ userSelect: "none" }}
              >
                {rowCol.name.length > 11 ? rowCol.name.slice(0, 11) + "…" : rowCol.name}
              </text>
              {displayed.map((_, j) => {
                const r = matrix[i][j];
                const isDiag = i === j;
                return (
                  <rect
                    key={`cell-${i}-${j}`}
                    x={labelW + j * cellSize + 1}
                    y={1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={2}
                    fill={isDiag ? "rgba(255,255,255,0.08)" : cellColor(r, accent)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      if (!isDiag) {
                        const rect = (e.target as SVGRectElement).closest("svg")!.getBoundingClientRect();
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top - 36,
                          text: `${rowCol.name} × ${displayed[j].name}: r = ${r.toFixed(3)}`,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              {/* Cell value labels */}
              {displayed.map((_, j) => {
                const r = matrix[i][j];
                if (i === j || Math.abs(r) <= 0.4) return null;
                return (
                  <text
                    key={`val-${i}-${j}`}
                    x={labelW + j * cellSize + cellSize / 2}
                    y={cellSize / 2 + 3.5}
                    textAnchor="middle"
                    fontSize={Math.min(9, cellSize * 0.42)}
                    fontWeight={600}
                    fill="white"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {r.toFixed(2)}
                  </text>
                );
              })}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: "absolute",
            left: tooltip.x + 8,
            top: tooltip.y,
            background: "rgba(6,13,26,0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: "0.72rem",
            color: "var(--text, #f1f5f9)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>

      <div style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)", marginTop: "0.4rem" }}>
        Orange = positive r · Blue = negative r · Values shown when |r| &gt; 0.4 · |r| &gt; 0.7 = multicollinearity risk
      </div>
    </div>
  );
}