"use client";

import { ColumnInfo } from "@/lib/preprocessingAlgorithms";

const ACCENT = "#377f8a";

export function MiniDistChart({ col, width = 160, dimmed = false }: { col: ColumnInfo; width?: number; dimmed?: boolean }) {
  const { min = 0, max = 0, mean = 0, std = 1, skew = 0 } = col;
  const W = width, H = 48;

  if (min === max) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ opacity: dimmed ? 0.45 : 1 }}>
        <line x1={W / 2} y1={H} x2={W / 2} y2={4} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
        <circle cx={W / 2} cy={4} r={2.5} fill={ACCENT} />
      </svg>
    );
  }

  const N = 80;
  const range = max - min;
  const skewFactor = Math.max(-0.7, Math.min(0.7, (skew ?? 0) * 0.28));
  const yVals: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = min + (i / N) * range;
    const isRight = x >= mean;
    const effStd = Math.max(range * 0.001, isRight
      ? (std || range * 0.2) * (1 + skewFactor)
      : (std || range * 0.2) * (1 - skewFactor));
    yVals.push(Math.exp(-0.5 * ((x - mean) / effStd) ** 2));
  }

  const maxY = Math.max(...yVals, 0.01);
  const pts = yVals.map((y, i) => ({ sx: (i / N) * W, sy: H - 2 - ((y / maxY) * (H - 8)) }));
  const fillPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ") + ` L${W},${H} L0,${H} Z`;
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
  const meanX = ((mean - min) / range) * W;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", opacity: dimmed ? 0.45 : 1 }}>
      <path d={fillPath} fill={ACCENT} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1={meanX} y1={H} x2={meanX} y2={4} stroke={ACCENT} strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.7" />
    </svg>
  );
}