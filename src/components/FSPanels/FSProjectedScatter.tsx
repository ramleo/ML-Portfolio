"use client";

import type { ScatterPoint } from "@/lib/fsCore";

const PALETTE = [
  "#fb923c", "#60a5fa", "#34d399", "#f472b6",
  "#a78bfa", "#fbbf24", "#4ade80", "#f87171",
];

interface Props {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  accent: string;
}

export default function FSProjectedScatter({ points, xLabel, yLabel, accent }: Props) {
  if (points.length < 2) return null;

  const labels = [...new Set(points.map(p => p.label))].sort();
  const colorMap = new Map(labels.map((l, i) => [l, PALETTE[i % PALETTE.length]]));
  const multiClass = labels.length > 1;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs), xRange = xMax - xMin || 1;
  const yMin = Math.min(...ys), yMax = Math.max(...ys), yRange = yMax - yMin || 1;
  const W = 420, H = 200, PX = 32, PY = 20;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text3)", marginBottom: "0.35rem" }}>
        {xLabel} vs {yLabel} projection
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <line x1={PX} y1={PY}     x2={PX}      y2={H - PY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <text x={W / 2} y={H - 4}  textAnchor="middle" fontSize={6} fill="rgba(255,255,255,0.5)">{xLabel}</text>
        <text x={9}     y={H / 2}  textAnchor="middle" fontSize={6} fill="rgba(255,255,255,0.5)"
          transform={`rotate(-90,9,${H / 2})`}>{yLabel}</text>
        {points.map((p, i) => {
          const cx = PX + ((p.x - xMin) / xRange) * (W - PX * 2);
          const cy = H - PY - ((p.y - yMin) / yRange) * (H - PY * 2);
          const fill = multiClass ? (colorMap.get(p.label) ?? accent) : accent;
          return (
            <circle key={i} cx={cx} cy={cy} r={1.5}
              fill={fill} fillOpacity={0.72}
              stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
          );
        })}
      </svg>
      {multiClass && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.3rem" }}>
          {labels.map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}