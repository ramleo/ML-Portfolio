"use client";

const ACCENT = "#966f2b";

interface FIEntry { feature: string; importance: number }
interface CVEntry { name: string; score: number }
interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
}

function contributionLabel(pct: number): string {
  if (pct >= 20) return "High positive";
  if (pct >= 5) return "Moderate";
  return "Low";
}

export default function ShapResults({ result }: { result: TrainResult }) {
  const topFeatures = result.feature_importance.slice(0, 10);
  const totalImportance = result.feature_importance.reduce((s, f) => s + f.importance, 0) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* CV score badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, borderRadius: 8, alignSelf: "flex-start" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>CV Score</span>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: ACCENT }}>{result.cv_results[0]?.score?.toFixed(4) ?? "—"}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>({result.winner})</span>
      </div>

      {/* Top feature callout */}
      {result.feature_importance.length > 0 && (
        <div style={{ padding: "0.85rem 1rem", background: `${ACCENT}0a`, border: `1px solid ${ACCENT}22`, borderRadius: 10 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.2rem" }}>Most Impactful Feature</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
            {result.feature_importance[0].feature}{" "}
            <span style={{ color: ACCENT }}>({result.feature_importance[0].importance.toFixed(1)}%)</span>
          </div>
        </div>
      )}

      {/* SHAP-style importance bars */}
      {topFeatures.length > 0 && (
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>SHAP-style Importance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {topFeatures.map((f, i) => {
              const max = topFeatures[0]?.importance ?? 1;
              return (
                <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span style={{ width: 150, fontSize: "0.75rem", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "var(--text)" : "var(--text2)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.feature}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 9999, background: "rgba(var(--fg-rgb),0.07)" }}>
                    <div style={{ height: "100%", width: `${(f.importance / max) * 100}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}55` }} />
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, width: 45, textAlign: "right" }}>{f.importance.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature breakdown table */}
      {topFeatures.length > 0 && (
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Feature Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px", gap: "0.5rem", padding: "0.3rem 0.6rem", fontSize: "0.63rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(var(--fg-rgb),0.07)" }}>
              <span>Feature</span><span style={{ textAlign: "right" }}>Importance</span><span style={{ textAlign: "right" }}>Contribution</span>
            </div>
            {topFeatures.map((f, i) => {
              const pct = (f.importance / totalImportance) * 100;
              const label = contributionLabel(pct);
              const labelColor = pct >= 20 ? "#34d399" : pct >= 5 ? ACCENT : "var(--text3)";
              return (
                <div key={f.feature} style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px", gap: "0.5rem", padding: "0.45rem 0.6rem", fontSize: "0.78rem", borderBottom: "1px solid rgba(var(--fg-rgb),0.04)", background: i % 2 === 0 ? "rgba(0,0,0,0.12)" : "transparent", alignItems: "center" }}>
                  <span style={{ color: "var(--text)", fontWeight: i === 0 ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.feature}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: ACCENT }}>{f.importance.toFixed(1)}%</span>
                  <span style={{ textAlign: "right", fontSize: "0.72rem", fontWeight: 600, color: labelColor }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Winner metrics */}
      {Object.keys(result.winner_metrics).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.6rem" }}>
          {Object.entries(result.winner_metrics).map(([k, v]) => (
            <div key={k} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.6rem 0.8rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text)" }}>{typeof v === "number" ? v.toFixed(4) : v}</div>
              <div style={{ fontSize: "0.63rem", color: "var(--text3)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
