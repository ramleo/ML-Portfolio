"use client";

import type { FeatureScore, SelectionResult, PCAComponent } from "@/lib/fsAlgorithms";

// ── Score Comparison Chart ─────────────────────────────────────────────────────

interface ScoreProps {
  features: FeatureScore[];
  result: SelectionResult;
  accent?: string;
}

export function ScoreComparisonChart({ features, result, accent = "#fb923c" }: ScoreProps) {
  const activeMethods = [
    { key: "mi",    label: "MI Score",   color: accent,     score: (f: FeatureScore) => f.score },
    { key: "kbest", label: "F/K Best",   color: "#a78bfa",  score: (f: FeatureScore) => f.fScore,     active: result.kBestActive },
    { key: "lasso", label: "Lasso",      color: "#f97316",  score: (f: FeatureScore) => f.lassoScore,  active: result.lassoActive },
    { key: "ridge", label: "Ridge",      color: "#6366f1",  score: (f: FeatureScore) => f.ridgeScore,  active: result.ridgeActive },
    { key: "tree",  label: "Tree Imp.",  color: "#34d399",  score: (f: FeatureScore) => f.treeScore,   active: result.treeActive },
  ];

  const methods = activeMethods.filter(m => m.key === "mi" || m.active);
  const activeSecondary = methods.filter(m => m.key !== "mi");
  if (activeSecondary.length === 0) return null;

  const shown = [...features]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text, #f1f5f9)" }}>Score Comparison</span>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {methods.map(m => (
            <div key={m.key} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: m.color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)" }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {shown.map(f => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", opacity: f.kept ? 1 : 0.35 }}>
            <span
              title={f.name}
              style={{
                width: 120, fontSize: "0.74rem", color: "var(--text, #f1f5f9)",
                flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {f.name}
            </span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              {methods.map(m => {
                const val = m.score(f);
                return (
                  <div key={m.key} style={{ height: 5, borderRadius: 9999, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.max(val * 100, val > 0 ? 2 : 0)}%`,
                      borderRadius: 9999,
                      background: m.color,
                      transition: "width 0.35s",
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PCA Scree Chart ────────────────────────────────────────────────────────────

interface ScreeProps {
  components: PCAComponent[];
  accent?: string;
}

export function PCAScreeChart({ components, accent = "#fb923c" }: ScreeProps) {
  if (components.length === 0) return null;

  const padL = 42, padB = 28, padR = 12, padT = 20;
  const W = 480, H = 200;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxVar = Math.min(1, Math.max(...components.map(c => c.varianceExplained)) * 1.2);
  const barW = Math.floor(plotW / components.length) - 6;
  const barGap = (plotW - barW * components.length) / (components.length + 1);

  const yScale = (v: number) => plotH - (v / maxVar) * plotH;

  const cumulativePoints = components.map((c, i) => {
    const x = padL + barGap * (i + 1) + barW * i + barW / 2;
    const y = padT + yScale(c.cumulativeVariance);
    return { x, y, cum: c.cumulativeVariance };
  });

  const polyline = cumulativePoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text, #f1f5f9)" }}>Variance Explained per Component</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <div style={{ width: 20, height: 2, background: "#60a5fa", borderRadius: 9999 }} />
          <span style={{ fontSize: "0.7rem", color: "var(--text3, #9ca3af)" }}>Cumulative</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Y axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => {
          if (v > maxVar + 0.05) return null;
          const y = padT + yScale(v);
          return (
            <g key={v}>
              <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <text x={padL - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.4)">
                {Math.round(v * 100)}%
              </text>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            </g>
          );
        })}

        {/* Bars */}
        {components.map((c, i) => {
          const x = padL + barGap * (i + 1) + barW * i;
          const barH = (c.varianceExplained / maxVar) * plotH;
          const y = padT + plotH - barH;
          const pct = (c.varianceExplained * 100).toFixed(1);
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={accent} opacity={0.82} />
              {barH > 18 && (
                <text x={x + barW / 2} y={y + barH / 2 + 4} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,0.8)" fontWeight={700}>
                  {pct}%
                </text>
              )}
              <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">
                PC{c.index}
              </text>
            </g>
          );
        })}

        {/* Cumulative line */}
        <polyline points={polyline} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
        {cumulativePoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#60a5fa" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize={8.5} fill="#60a5fa">
              {(p.cum * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      </svg>
    </div>
  );
}