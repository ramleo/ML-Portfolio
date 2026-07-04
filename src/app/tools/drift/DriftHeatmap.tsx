"use client";

import { useState, useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

interface HistFeat {
  name: string;
  label?: string;
  drift_score: number;
  drift_level: string;
}

interface HistSnap {
  ts: number;
  label?: string;
  overall_score: number;
  features: HistFeat[];
}

function scoreColor(s: number): string {
  if (s <= 0.35) {
    const t = s / 0.35;
    return `rgb(${Math.round(52 + 199 * t)}, ${Math.round(211 - 20 * t)}, ${Math.round(153 - 117 * t)})`;
  }
  const t = Math.min((s - 0.35) / 0.3, 1);
  return `rgb(${Math.round(251 + (248 - 251) * t)}, ${Math.round(191 - 78 * t)}, ${Math.round(36 + 77 * t)})`;
}

function formatBatchLabel(snap: HistSnap, idx: number): string {
  if (snap.label) return snap.label.length > 9 ? snap.label.slice(0, 9) + "…" : snap.label;
  const d = new Date(snap.ts * 1000);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function DriftHeatmap({ modelId }: { modelId: string }) {
  const [history, setHistory] = useState<HistSnap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${ML_UNIFIED_API}/drift/${modelId}/history`)
      .then(r => r.json())
      .then(d => {
        const snaps = (d.history ?? []).filter((s: HistSnap) => s.features?.length > 0);
        setHistory(snaps.slice(-20));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [modelId]);

  if (loading || history.length < 2) return null;

  const featNames = Array.from(
    new Set(history.flatMap(s => s.features.map(f => f.name)))
  );
  const featLabels: Record<string, string> = {};
  history.forEach(s => s.features.forEach(f => { featLabels[f.name] = f.label ?? f.name; }));

  const CELL_W = 60, CELL_H = 30, LABEL_W = 130, HEADER_H = 44;
  const W = LABEL_W + history.length * CELL_W;
  const H = HEADER_H + featNames.length * CELL_H + 24;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "1.25rem 1.5rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Drift Heatmap Over Time</span>
        <span style={{ fontSize: "0.62rem", color: "var(--text3)", marginLeft: 4 }}>{history.length} batches</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg width={W} height={H}>
          {/* Column headers */}
          {history.map((snap, j) => (
            <text key={j}
              x={LABEL_W + j * CELL_W + CELL_W / 2}
              y={HEADER_H - 6}
              textAnchor="middle"
              transform={`rotate(-35 ${LABEL_W + j * CELL_W + CELL_W / 2} ${HEADER_H - 6})`}
              fill="var(--text3)" fontSize="9">
              {formatBatchLabel(snap, j)}
            </text>
          ))}

          {/* Overall score row */}
          <text x={LABEL_W - 6} y={HEADER_H + 10} textAnchor="end" fill="var(--text2)" fontSize="10" fontWeight="600">
            Overall
          </text>
          {history.map((snap, j) => {
            const color = scoreColor(snap.overall_score);
            return (
              <g key={j}>
                <rect x={LABEL_W + j * CELL_W + 1} y={HEADER_H - 4} width={CELL_W - 2} height={CELL_H - 2}
                  fill={color} opacity={0.15 + snap.overall_score * 0.55} rx={3} />
                <text x={LABEL_W + j * CELL_W + CELL_W / 2} y={HEADER_H + 10}
                  textAnchor="middle" fill={color} fontSize="9" fontWeight="700">
                  {(snap.overall_score * 100).toFixed(0)}%
                </text>
                <title>{`Overall: ${(snap.overall_score * 100).toFixed(1)}%`}</title>
              </g>
            );
          })}

          {/* Separator */}
          <line x1={0} x2={W} y1={HEADER_H + CELL_H - 2} y2={HEADER_H + CELL_H - 2} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* Feature rows */}
          {featNames.map((name, i) => {
            const y = HEADER_H + CELL_H + i * CELL_H;
            const label = featLabels[name] ?? name;
            return (
              <g key={name}>
                <text x={LABEL_W - 6} y={y + CELL_H / 2 + 4} textAnchor="end" fill="var(--text2)" fontSize="10">
                  {label.length > 16 ? label.slice(0, 16) + "…" : label}
                </text>
                {history.map((snap, j) => {
                  const feat = snap.features.find(f => f.name === name);
                  const score = feat?.drift_score ?? 0;
                  const color = scoreColor(score);
                  return (
                    <g key={j}>
                      <rect x={LABEL_W + j * CELL_W + 1} y={y + 1} width={CELL_W - 2} height={CELL_H - 2}
                        fill={feat ? color : "rgba(255,255,255,0.03)"}
                        opacity={feat ? 0.12 + score * 0.55 : 1} rx={3} />
                      <text x={LABEL_W + j * CELL_W + CELL_W / 2} y={y + CELL_H / 2 + 4}
                        textAnchor="middle" fill={feat ? color : "var(--text3)"} fontSize="9" fontWeight={feat ? "600" : "400"}>
                        {feat ? (score * 100).toFixed(0) + "%" : "—"}
                      </text>
                      <title>{`${label}: ${feat ? `${(score * 100).toFixed(1)}% (${feat.drift_level})` : "no data"}`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.58rem", color: "var(--text3)", marginTop: "0.75rem" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#34d399", borderRadius: 2, marginRight: 3, verticalAlign: "middle", opacity: 0.7 }} />Low (&lt;35%)</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fbbf24", borderRadius: 2, marginRight: 3, verticalAlign: "middle", opacity: 0.7 }} />Medium (35–65%)</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f87171", borderRadius: 2, marginRight: 3, verticalAlign: "middle", opacity: 0.7 }} />High (&gt;65%)</span>
      </div>
    </div>
  );
}