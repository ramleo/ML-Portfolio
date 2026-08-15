"use client";

import { FeatureDrift, levelColor } from "./driftTypes";

const LEVEL_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function DriftRankingChart({ features }: { features: FeatureDrift[] }) {
  const sorted = [...features].sort((a, b) =>
    LEVEL_ORDER[a.drift_level] - LEVEL_ORDER[b.drift_level] || b.drift_score - a.drift_score
  );
  const maxScore = Math.max(...sorted.map(f => f.drift_score), 0.01);

  return (
    <div style={{
      background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Feature Drift Rankings</div>
        <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginTop: 3 }}>
          Every feature ranked by drift severity. Bar length = how far the distribution shifted from training.
          Sorted high → low.
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.58rem", marginBottom: "1rem" }}>
        {(["high", "medium", "low"] as const).map(lv => (
          <span key={lv} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text3)" }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: levelColor(lv) }} />
            {lv}
          </span>
        ))}
        <span style={{ color: "var(--text3)", marginLeft: "auto", fontStyle: "italic" }}>
          bars are relative — 100% = highest drift in this batch
        </span>
      </div>

      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {sorted.map((f, idx) => {
          const lc   = levelColor(f.drift_level);
          const pct  = (f.drift_score / maxScore) * 100;
          const isDivider = idx > 0 && sorted[idx - 1].drift_level !== f.drift_level;
          return (
            <div key={f.name}>
              {isDivider && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0.3rem 0" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Name */}
                <div style={{
                  width: 138, fontSize: "0.63rem", color: f.drift_level === "high" ? "var(--text)" : "var(--text2)",
                  textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0,
                  fontWeight: f.drift_level === "high" ? 600 : 400,
                }}>
                  {f.label}
                </div>

                {/* Bar track */}
                <div style={{ flex: 1, height: 16, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: `linear-gradient(90deg, ${lc}66, ${lc}cc)`,
                    borderRadius: 4, transition: "width 0.6s ease",
                    minWidth: pct > 0 ? 3 : 0,
                    position: "relative",
                  }}>
                    {/* PSI label inside bar when wide enough */}
                    {pct > 25 && (
                      <span style={{
                        position: "absolute", right: 6, top: 0, height: "100%",
                        display: "flex", alignItems: "center",
                        fontSize: "0.5rem", color: "rgba(0,0,0,0.6)", fontWeight: 700,
                      }}>
                        PSI {f.psi.toFixed(3)}
                      </span>
                    )}
                  </div>
                  {pct === 0 && (
                    <span style={{ position: "absolute", left: 6, top: 0, height: "100%", display: "flex", alignItems: "center", fontSize: "0.52rem", color: "var(--text3)" }}>
                      no drift detected
                    </span>
                  )}
                </div>

                {/* Score % */}
                <div style={{ width: 36, fontSize: "0.63rem", fontWeight: 700, color: lc, textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {(f.drift_score * 100).toFixed(0)}%
                </div>

                {/* Type pill */}
                <div style={{
                  width: 44, fontSize: "0.52rem", color: "var(--text3)", textAlign: "center",
                  padding: "1px 4px", borderRadius: 4, background: "rgba(255,255,255,0.05)", flexShrink: 0,
                }}>
                  {f.type === "numeric" ? "num" : "cat"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}