"use client";

import { DriftResult, TrendPoint, levelColor, ACCENT } from "./driftTypes";

// ── Trend chart ────────────────────────────────────────────────────────────────

function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;
  const W = 280; const H = 52;
  const PAD_L = 28; const PAD_R = 8;
  const scores = points.map(p => p.overall_score);
  const mn = Math.min(...scores, 0);
  const mx = Math.max(...scores, mn + 0.01);
  const xs = points.map((_, i) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R));
  const ys = scores.map(s => 4 + (1 - (s - mn) / (mx - mn)) * (H - 8));
  const d  = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");

  // fill area under curve
  const fillD = `${d} L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;

  const yTicks = [0, 0.1, 0.25, 0.5, 1].filter(t => t <= mx * 1.1);

  return (
    <div>
      <div style={{ fontSize: "0.58rem", color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Drift Trend · {points.length} batches</div>
      <svg width={W} height={H + 26} style={{ display: "block", overflow: "visible" }}>
        {/* Y-axis grid */}
        {yTicks.map(t => {
          const y = 4 + (1 - (t - mn) / (mx - mn)) * (H - 8);
          if (y < 0 || y > H) return null;
          return (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PAD_L - 3} y={y + 3.5} textAnchor="end" fill="var(--text3)" fontSize="7">{(t * 100).toFixed(0)}%</text>
            </g>
          );
        })}
        {/* Fill area */}
        <path d={fillD} fill={`${ACCENT}12`} />
        {/* Trend line */}
        <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r={4} fill={levelColor(p.overall_level)} stroke="rgba(0,0,0,0.5)" strokeWidth={1.2} />
          </g>
        ))}
        {/* X-axis labels */}
        {points.map((p, i) => {
          const every = Math.max(1, Math.ceil(points.length / 5));
          if (i % every !== 0 && i !== points.length - 1) return null;
          const lbl = p.label ? p.label.slice(0, 10) : `#${i + 1}`;
          return (
            <text key={i} x={xs[i]} y={H + 16} textAnchor="middle" fill="var(--text3)" fontSize="8">{lbl}</text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Feature breakdown bar ──────────────────────────────────────────────────────

function FeatureBreakdown({ features }: { features: DriftResult["features"] }) {
  const high = features.filter(f => f.drift_level === "high").length;
  const med  = features.filter(f => f.drift_level === "medium").length;
  const low  = features.filter(f => f.drift_level === "low").length;
  const total = features.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: "0.58rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Feature Breakdown · {total} features
      </div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
        {high > 0 && <div style={{ flex: high, background: "#f87171", borderRadius: "4px 0 0 4px" }} title={`${high} high-drift`} />}
        {med  > 0 && <div style={{ flex: med,  background: "#fbbf24" }} title={`${med} medium-drift`} />}
        {low  > 0 && <div style={{ flex: low,  background: "#34d399", borderRadius: high === 0 && med === 0 ? 4 : "0 4px 4px 0" }} title={`${low} low-drift`} />}
      </div>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.6rem" }}>
        {high > 0 && <span style={{ color: "#f87171" }}>{high} high</span>}
        {med  > 0 && <span style={{ color: "#fbbf24" }}>{med} medium</span>}
        {low  > 0 && <span style={{ color: "#34d399" }}>{low} low</span>}
      </div>
    </div>
  );
}

// ── Overall drift score display ────────────────────────────────────────────────

function OverallScore({ score, level }: { score: number; level: string }) {
  const color = levelColor(level);
  const pct   = score * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 160 }}>
      <div style={{ fontSize: "0.58rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall Drift</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
        <span style={{ fontSize: "2.8rem", fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {pct.toFixed(0)}
        </span>
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color, opacity: 0.7 }}>%</span>
        <span style={{
          fontSize: "0.65rem", fontWeight: 700, color, textTransform: "uppercase",
          marginLeft: 6, padding: "2px 8px", borderRadius: 9999,
          background: `${color}18`, border: `1px solid ${color}44`,
        }}>
          {level}
        </span>
      </div>
      {/* Score bar */}
      <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: "10%", width: 1.5, background: "#fbbf2455" }} title="10% — medium threshold" />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: "25%", width: 1.5, background: "#f8717155" }} title="25% — high threshold" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", color: "var(--text3)" }}>
        <span>0%</span>
        <span style={{ color: "#fbbf2488" }}>↑ med (10%)</span>
        <span style={{ color: "#f8717188" }}>↑ high (25%)</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── Main overview card ─────────────────────────────────────────────────────────

export default function DriftOverview({ result }: { result: DriftResult }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "1.5rem",
      display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-start",
    }}>
      {/* Score */}
      <OverallScore score={result.overall_score} level={result.overall_level} />

      {/* Meta + breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", flex: 1, minWidth: 180 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.3rem 1rem",
          fontSize: "0.65rem", color: "var(--text3)",
        }}>
          <span>Batch rows</span><strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{result.n_recent.toLocaleString()}</strong>
          <span>Baseline</span><strong style={{ color: "var(--text)" }}>{result.baseline}</strong>
          {result.label && <><span>Label</span><strong style={{ color: ACCENT }}>{result.label}</strong></>}
          {result.filename && <><span>File</span><strong style={{ color: "var(--text)" }}>{result.filename}</strong></>}
        </div>
        <FeatureBreakdown features={result.features} />
      </div>

      {/* Trend chart */}
      {result.trend.length >= 2 && (
        <div style={{ minWidth: 200 }}>
          <TrendChart points={result.trend} />
        </div>
      )}
    </div>
  );
}