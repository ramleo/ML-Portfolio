"use client";

import { CorrelationData, ACCENT } from "./driftTypes";

function corrColor(v: number): string {
  const abs = Math.abs(v);
  const alpha = 0.08 + 0.72 * abs;
  if (v >= 0) return `rgba(248, 113, 113, ${alpha.toFixed(2)})`;
  return `rgba(96, 165, 250, ${alpha.toFixed(2)})`;
}

function corrTextColor(v: number, diagonal: boolean): string {
  if (diagonal) return ACCENT;
  return Math.abs(v) > 0.4 ? "var(--text)" : "var(--text3)";
}

export default function DriftCorrelation({ correlation }: { correlation: CorrelationData }) {
  const { features, matrix } = correlation;
  const n = features.length;
  if (n < 2) return null;

  const CELL = Math.max(44, Math.min(64, Math.floor(480 / n)));
  const LABEL_W = 110;
  const HEADER_H = LABEL_W;
  const W = LABEL_W + n * CELL;
  const H = HEADER_H + n * CELL + 12;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
          <line x1="7" y1="5" x2="17" y2="5" /><line x1="5" y1="7" x2="5" y2="17" />
          <line x1="7" y1="19" x2="17" y2="19" /><line x1="19" y1="7" x2="19" y2="17" />
          <line x1="7" y1="7" x2="17" y2="17" />
        </svg>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Batch Feature Correlation</span>
        <span style={{ fontSize: "0.62rem", color: "var(--text3)", marginLeft: 4 }}>{n} features · Pearson r</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H}>
          {/* Column headers (rotated) */}
          {features.map((f, j) => {
            const cx = LABEL_W + j * CELL + CELL / 2;
            const cy = HEADER_H - 6;
            const label = f.length > 11 ? f.slice(0, 11) + "…" : f;
            return (
              <text key={j} x={cx} y={cy}
                textAnchor="end"
                transform={`rotate(-40 ${cx} ${cy})`}
                fill="var(--text3)" fontSize="9.5">
                {label}
              </text>
            );
          })}

          {/* Row labels + cells */}
          {features.map((f, i) => {
            const rowY = HEADER_H + i * CELL;
            const label = f.length > 14 ? f.slice(0, 14) + "…" : f;
            return (
              <g key={i}>
                <text x={LABEL_W - 6} y={rowY + CELL / 2 + 4}
                  textAnchor="end" fill="var(--text2)" fontSize="9.5">
                  {label}
                </text>
                {features.map((_, j) => {
                  const v = matrix[i][j];
                  const diag = i === j;
                  const cellX = LABEL_W + j * CELL;
                  const bg = diag ? `${ACCENT}25` : corrColor(v);
                  const txtColor = corrTextColor(v, diag);
                  return (
                    <g key={j}>
                      <rect x={cellX} y={rowY} width={CELL} height={CELL} fill={bg} />
                      <text x={cellX + CELL / 2} y={rowY + CELL / 2 + 4}
                        textAnchor="middle" fill={txtColor} fontSize="9.5" fontWeight={Math.abs(v) > 0.5 ? "700" : "400"}>
                        {diag ? "1" : v.toFixed(2)}
                      </text>
                      <title>{`${features[i]} × ${features[j]}: r = ${v.toFixed(3)}`}</title>
                    </g>
                  );
                })}
                {/* Row separator */}
                <line x1={LABEL_W} x2={W} y1={rowY + CELL} y2={rowY + CELL} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Column separators */}
          {features.map((_, j) => (
            <line key={j} x1={LABEL_W + (j + 1) * CELL} x2={LABEL_W + (j + 1) * CELL}
              y1={HEADER_H} y2={HEADER_H + n * CELL}
              stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.58rem", color: "var(--text3)", marginTop: "0.75rem", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="40" height="10">
            <defs>
              <linearGradient id="corrLegend" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(96,165,250,0.7)" />
                <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(248,113,113,0.7)" />
              </linearGradient>
            </defs>
            <rect width="40" height="10" fill="url(#corrLegend)" rx="2" />
          </svg>
          −1 (negative) → 0 → +1 (positive)
        </span>
        <span>Diagonal = self-correlation (always 1)</span>
      </div>
    </div>
  );
}