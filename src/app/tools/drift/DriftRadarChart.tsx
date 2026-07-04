"use client";

import { FeatureDrift, levelColor, ACCENT } from "./driftTypes";

const CX = 190, CY = 160, R = 120;
const GRID = [0.25, 0.5, 0.75, 1.0];

function spoke(angle: number, r: number) {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as [number, number];
}

function polyPath(pts: [number, number][]) {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
}

export default function DriftRadarChart({ features }: { features: FeatureDrift[] }) {
  if (features.length < 3) return null;

  const n = features.length;
  const angles = features.map((_, i) => (2 * Math.PI * i) / n - Math.PI / 2);

  // drift polygon
  const driftPts = features.map((f, i) => spoke(angles[i], Math.min(f.drift_score, 1) * R));

  // label anchor based on angle (left/center/right)
  function anchor(a: number): "start" | "middle" | "end" {
    const cos = Math.cos(a);
    if (cos > 0.2) return "start";
    if (cos < -0.2) return "end";
    return "middle";
  }

  // label dy baseline based on sin
  function dy(a: number): number {
    const s = Math.sin(a);
    if (s > 0.2) return 10;
    if (s < -0.2) return -4;
    return 4;
  }

  const LABEL_R = R + 22;
  const VW = 380, VH = 320;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Drift Fingerprint</div>
        <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginTop: 3 }}>
          Radar chart of all features — each spoke is one feature, radius = drift severity.
          A tight polygon = stable model. Spikes = problem features.
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.2rem", fontSize: "0.58rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {(["high", "medium", "low"] as const).map(lv => (
          <span key={lv} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text3)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: levelColor(lv) }} />
            {lv}
          </span>
        ))}
        <span style={{ color: "var(--text3)", fontStyle: "italic", marginLeft: "auto" }}>
          Grid rings: 25% / 50% / 75% / 100%
        </span>
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label="Drift radar chart">
        {/* Grid rings */}
        {GRID.map(t => (
          <circle key={t} cx={CX} cy={CY} r={R * t}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={t === 1 ? 1.5 : 0.8} />
        ))}

        {/* Grid ring labels */}
        {GRID.map(t => (
          <text key={t} x={CX + 3} y={CY - R * t + 3} fontSize="7" fill="var(--text3)" opacity="0.7">
            {(t * 100).toFixed(0)}%
          </text>
        ))}

        {/* Spokes */}
        {angles.map((a, i) => {
          const [x, y] = spoke(a, R);
          return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />;
        })}

        {/* Drift fill polygon */}
        <path d={polyPath(driftPts)} fill={`${ACCENT}1a`} stroke={ACCENT} strokeWidth={1.8} strokeLinejoin="round" />

        {/* Dots at each feature */}
        {driftPts.map((p, i) => {
          const f = features[i];
          return (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={4} fill={levelColor(f.drift_level)} stroke="rgba(0,0,0,0.4)" strokeWidth={1}>
                <title>{f.label} — {f.drift_level} drift ({(f.drift_score * 100).toFixed(0)}%)</title>
              </circle>
            </g>
          );
        })}

        {/* Feature labels at spoke ends */}
        {features.map((f, i) => {
          const a = angles[i];
          const [lx, ly] = spoke(a, LABEL_R);
          const lc = levelColor(f.drift_level);
          const shortName = f.label.length > 13 ? f.label.slice(0, 12) + "…" : f.label;
          return (
            <text key={i}
              x={lx.toFixed(1)} y={(ly + dy(a)).toFixed(1)}
              textAnchor={anchor(a)} fontSize="8.5"
              fontWeight={f.drift_level === "high" ? "700" : "400"}
              fill={f.drift_level !== "low" ? lc : "var(--text3)"}
            >
              {shortName}
            </text>
          );
        })}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}