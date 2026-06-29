"use client";

const ACCENT = "#10b981";

interface CVEntry { name: string; score: number; fold_scores?: number[] }
interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: { feature: string; importance: number }[];
}

function modelConsistency(entry: CVEntry): string {
  if (!entry.fold_scores || entry.fold_scores.length < 2) return "";
  const mean = entry.fold_scores.reduce((a, b) => a + b, 0) / entry.fold_scores.length;
  const variance = entry.fold_scores.reduce((a, b) => a + (b - mean) ** 2, 0) / entry.fold_scores.length;
  return Math.sqrt(variance) < 0.03 ? "Consistent" : "Variable";
}

export default function EnsembleResults({ result }: { result: TrainResult }) {
  const sorted = [...result.cv_results].sort((a, b) => b.score - a.score);
  const scores = sorted.map(r => r.score);
  const spread = scores.length >= 2 ? (Math.max(...scores) - Math.min(...scores)) * 100 : 0;
  const rankColors = ["#f59e0b", "#94a3b8", "#cd7f32"];
  const maxScore = scores[0] ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Winner badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 1rem", background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, borderRadius: 10, alignSelf: "flex-start" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.07em" }}>Winner</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text)" }}>{result.winner}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: ACCENT }}>{sorted.find(r => r.name === result.winner)?.score?.toFixed(4) ?? ""}</span>
      </div>

      {/* Ensemble spread metric */}
      {scores.length >= 2 && (
        <div style={{ padding: "0.7rem 0.9rem", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: "0.78rem", color: "var(--text2)" }}>
          Top models within <strong style={{ color: ACCENT }}>{spread.toFixed(1)}%</strong> of each other
        </div>
      )}

      {/* CV Leaderboard with bar + consistency */}
      {sorted.length > 0 && (
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Algorithm Leaderboard</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 90px 80px 80px", gap: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.63rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span>#</span><span>Model</span><span style={{ textAlign: "right" }}>Score</span><span></span><span style={{ textAlign: "right" }}>Stability</span>
            </div>
            {sorted.map((r, i) => {
              const isWinner = r.name === result.winner;
              const barPct = maxScore > 0 ? (r.score / maxScore) * 100 : 0;
              const consistency = modelConsistency(r);
              const consistColor = consistency === "Consistent" ? "#34d399" : consistency === "Variable" ? "#f59e0b" : "var(--text3)";
              return (
                <div key={r.name} style={{ display: "grid", gridTemplateColumns: "20px 1fr 90px 80px 80px", gap: "0.5rem", padding: "0.55rem 0.5rem", fontSize: "0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)", background: isWinner ? `${ACCENT}08` : "transparent", alignItems: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="8" fill={rankColors[i] ? `${rankColors[i]}22` : "rgba(255,255,255,0.06)"} stroke={rankColors[i] ?? "rgba(255,255,255,0.15)"} strokeWidth="1.2" />
                    <text x="9" y="12.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={rankColors[i] ?? "var(--text3)"}>{i + 1}</text>
                  </svg>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                    <span style={{ fontWeight: isWinner ? 700 : 500, color: isWinner ? "var(--text)" : "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    {isWinner && <span style={{ fontSize: "0.55rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", padding: "1px 5px", borderRadius: 9999, background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`, flexShrink: 0 }}>winner</span>}
                  </div>
                  <span style={{ fontWeight: 700, color: isWinner ? ACCENT : "var(--text2)", textAlign: "right" }}>{r.score.toFixed(4)}</span>
                  <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 9999, background: isWinner ? ACCENT : `${ACCENT}70` }} />
                  </div>
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: consistColor, textAlign: "right" }}>{consistency}</span>
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
