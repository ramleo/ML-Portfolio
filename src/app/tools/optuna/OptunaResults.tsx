"use client";

const ACCENT = "#a78bfa";

interface FIEntry { feature: string; importance: number }
interface CVEntry { name: string; score: number; fold_scores?: number[] }
interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
  best_params?: Record<string, number | string>;
}

export default function OptunaResults({ result }: { result: TrainResult }) {
  const bestParams = result.best_params && Object.keys(result.best_params).length > 0
    ? Object.entries(result.best_params)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* A. Best CV Score */}
      <div style={{ padding: "0.85rem 1rem", background: `${ACCENT}10`, border: `1px solid ${ACCENT}25`, borderRadius: 10 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>
          Best CV Score — {result.winner}
        </div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: ACCENT }}>
          {result.cv_results[0]?.score?.toFixed(4) ?? "—"}
        </div>
      </div>

      {/* B. Winner metrics */}
      {Object.keys(result.winner_metrics).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem" }}>
          {Object.entries(result.winner_metrics).map(([k, v]) => (
            <div key={k} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.6rem 0.8rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>
                {typeof v === "number" ? v.toFixed(4) : v}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
            </div>
          ))}
        </div>
      )}

      {/* C. Best Tuned Parameters */}
      <div style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${ACCENT}20`, borderRadius: 10, padding: "0.9rem 1rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
          Best Tuned Parameters
        </div>
        {bestParams ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {bestParams.map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.35rem 0.5rem", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                <span style={{ flex: 1, fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>{k}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT }}>
                  {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
            Tuning did not converge — default parameters used.
          </div>
        )}
      </div>

      {/* D. Feature Importance */}
      {result.feature_importance.length > 0 && (
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
            Feature Importance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {result.feature_importance.slice(0, 10).map((f, i) => {
              const max = result.feature_importance[0]?.importance ?? 1;
              return (
                <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span style={{ width: 160, fontSize: "0.75rem", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "var(--text)" : "var(--text2)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.feature}
                  </span>
                  <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ height: "100%", width: `${(f.importance / max) * 100}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 5px ${ACCENT}44` }} />
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, width: 45, textAlign: "right" }}>
                    {f.importance.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
