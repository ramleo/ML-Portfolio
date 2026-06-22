"use client";

// ── Shared chart/display sub-components used across AutoML steps ──────────────

import {
  ACCENT,
  type CVResult,
  type WinnerMetrics,
  type FeatureImportanceItem,
  type ModelComparisonItem,
} from "@/lib/automlUtils";

// ── ProgressBar ───────────────────────────────────────────────────────────────

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text2)" }}>{label}</span>
        <span style={{ fontSize: "0.78rem", color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${ACCENT}99, ${ACCENT})`,
          borderRadius: 9999, transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

// ── RankingTable ──────────────────────────────────────────────────────────────

export function RankingTable({ results, winner, task }: {
  results: CVResult[]; winner: string; task: "classification" | "regression";
}) {
  const sorted = [...results].sort((a, b) =>
    task === "regression" ? a.score - b.score : b.score - a.score
  );
  const winnerScore  = sorted[0].score;
  const barOpacities = [1, 0.65, 0.45, 0.3, 0.2];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.5rem" }}>
      {sorted.map((r, i) => {
        const isWinner = r.algorithm === winner;
        const barPct = task === "regression"
          ? Math.max(15, 100 - ((r.score - winnerScore) / (winnerScore || 1)) * 100)
          : Math.round((r.score / (winnerScore || 1)) * 100);
        const opacity    = barOpacities[Math.min(i, barOpacities.length - 1)];
        const scoreLabel = task === "regression"
          ? r.score.toFixed(2)
          : (r.score * 100).toFixed(2) + "%";
        const delta      = task === "regression"
          ? r.score - winnerScore
          : (r.score - winnerScore) * 100;
        const deltaLabel = task === "regression" ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}%`;

        return (
          <div key={r.algorithm} style={{
            padding: "0.55rem 0.85rem", borderRadius: 10,
            background: isWinner ? `${ACCENT}12` : "var(--bg-glass)",
            border: `1px solid ${isWinner ? ACCENT + "44" : "var(--border)"}`,
            display: "flex", alignItems: "center", gap: "0.65rem",
          }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: isWinner ? 700 : 500,
              color: isWinner ? ACCENT : "var(--text3)",
              width: 18, flexShrink: 0, fontVariantNumeric: "tabular-nums",
            }}>
              #{i + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", width: 140, flexShrink: 0 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: isWinner ? 700 : 500, color: isWinner ? "var(--text)" : "var(--text2)" }}>
                {r.algorithm}
              </span>
              {isWinner && (
                <span style={{
                  fontSize: "0.58rem", fontWeight: 700, padding: "1px 6px", borderRadius: 9999,
                  background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44`,
                  letterSpacing: "0.06em", textTransform: "uppercase" as const, flexShrink: 0,
                }}>WINNER</span>
              )}
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${barPct}%`,
                background: ACCENT, opacity,
                borderRadius: 9999, transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{
              fontSize: "0.8rem", fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: isWinner ? ACCENT : "var(--text3)",
              width: 58, textAlign: "right" as const, flexShrink: 0,
            }}>
              {scoreLabel}
            </span>
            <span style={{
              fontSize: "0.7rem", fontVariantNumeric: "tabular-nums",
              color: isWinner ? "transparent" : "var(--text3)",
              width: 52, textAlign: "right" as const, flexShrink: 0,
            }}>
              {!isWinner ? deltaLabel : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── WinnerMetricsGrid ─────────────────────────────────────────────────────────

export function WinnerMetricsGrid({ metrics, task }: { metrics: WinnerMetrics; task: "classification" | "regression" }) {
  const entries: { label: string; value: string }[] = [];
  if (task === "regression") {
    if (metrics.mae       != null) entries.push({ label: "MAE",       value: metrics.mae.toFixed(2) });
    if (metrics.rmse      != null) entries.push({ label: "RMSE",      value: metrics.rmse.toFixed(2) });
    if (metrics.mape      != null) entries.push({ label: "MAPE",      value: (metrics.mape * 100).toFixed(2) + "%" });
    if (metrics.r2        != null) entries.push({ label: "R²",        value: metrics.r2.toFixed(2) });
    if (metrics.max_error != null) entries.push({ label: "Max Error", value: metrics.max_error.toFixed(2) });
    if (metrics.median_ae != null) entries.push({ label: "Median AE", value: metrics.median_ae.toFixed(2) });
  } else {
    if (metrics.accuracy    != null) entries.push({ label: "Accuracy",  value: (metrics.accuracy * 100).toFixed(1) + "%" });
    if (metrics.f1_weighted != null) entries.push({ label: "F1",        value: metrics.f1_weighted.toFixed(2) });
    if (metrics.precision   != null) entries.push({ label: "Precision", value: metrics.precision.toFixed(2) });
    if (metrics.recall      != null) entries.push({ label: "Recall",    value: metrics.recall.toFixed(2) });
    if (metrics.roc_auc     != null) entries.push({ label: "ROC-AUC",   value: metrics.roc_auc.toFixed(2) });
  }
  if (!entries.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.85rem" }}>
      {entries.map(e => (
        <div key={e.label} style={{
          padding: "0.5rem 0.75rem", borderRadius: 8,
          background: `${ACCENT}0a`, border: `1px solid ${ACCENT}1a`, textAlign: "center" as const,
        }}>
          <div style={{ fontSize: "0.58rem", color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.15rem" }}>
            {e.label}
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
            {e.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FeatureImportanceChart ────────────────────────────────────────────────────

export function FeatureImportanceChart({ features }: { features: FeatureImportanceItem[] }) {
  const top = features.slice(0, 7);
  const max = top[0]?.importance ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {top.map(f => (
        <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{
            fontSize: "0.72rem", color: "var(--text2)", minWidth: 110,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, textAlign: "right" as const,
          }}>
            {f.feature}
          </span>
          <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(f.importance / max) * 100}%`,
              background: `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})`,
              borderRadius: 9999, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: ACCENT, fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" as const }}>
            {f.importance.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ModelComparisonChart ──────────────────────────────────────────────────────

export function ModelComparisonChart({ items }: { items: ModelComparisonItem[] }) {
  const sorted     = [...items].sort((a, b) => b.fitness_score - a.fitness_score);
  const W = 540, H = 150;
  const padL = 28, padR = 12, padT = 20, padB = 38;
  const chartW     = W - padL - padR;
  const chartH     = H - padT - padB;
  const n          = sorted.length;
  const xFor       = (i: number) => padL + (n < 2 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yFor       = (s: number) => padT + chartH - (s / 100) * chartH;
  const dotColor   = (s: number) => s >= 80 ? ACCENT : s >= 60 ? "#fbbf24" : "#f87171";
  const polyline   = sorted.map((item, i) => `${xFor(i)},${yFor(item.fitness_score)}`).join(" ");
  const shortName  = (name: string | undefined) => (name ?? "").replace("Random Forest", "Rand. Forest");

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible", display: "block" }}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padL} y1={yFor(v)} x2={W - padR} y2={yFor(v)}
              stroke="var(--border2)" strokeWidth="0.6" strokeDasharray="3,3" />
            <text x={padL - 4} y={yFor(v) + 3.5} fontSize="8" fill="var(--text3)" textAnchor="end">{v}</text>
          </g>
        ))}
        {n > 1 && (
          <polyline points={polyline} fill="none" stroke={`${ACCENT}44`} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {sorted.map((item, i) => {
          const cx    = xFor(i);
          const cy    = yFor(item.fitness_score);
          const color = dotColor(item.fitness_score);
          return (
            <g key={item.algorithm}>
              <text x={cx} y={cy - 9} fontSize="9" fill={color} textAnchor="middle" fontWeight="700">
                {item.fitness_score}
              </text>
              <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
              <circle cx={cx} cy={cy} r={3.5} fill={color} />
              <text x={cx} y={H - 4} fontSize="8.5" fill="var(--text3)" textAnchor="middle">
                {shortName(item.algorithm)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.5rem" }}>
        {sorted.map(item => (
          <div key={item.algorithm} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
              background: dotColor(item.fitness_score),
            }} />
            <p style={{ fontSize: "0.68rem", color: "var(--text3)", margin: 0, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600, color: "var(--text2)" }}>{item.algorithm}:</span>{" "}{item.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
