"use client";

import RepulsionCard from "@/components/RepulsionCard";
import UMAPScatter from "@/components/UMAPScatter";
import FSProjectedScatter from "@/components/FSPanels/FSProjectedScatter";
import type { SelectionResult, SelectionOpts, ColInfo } from "@/lib/fsAlgorithms";

const ACCENT = "#fb923c";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

// Palette for LDA class colours
const CLASS_COLORS = [
  "#fb923c", "#60a5fa", "#34d399", "#f472b6",
  "#a78bfa", "#fbbf24", "#4ade80", "#f87171",
];

interface Props {
  result: SelectionResult;
  opts: SelectionOpts;
  cols: ColInfo[];
  accent?: string;
  onDownloadFA: () => void;
  onDownloadLDA: () => void;
}

export default function FSReductionResultCards({
  result, opts, cols, accent = ACCENT, onDownloadFA, onDownloadLDA,
}: Props) {
  return (
    <>
      {/* ── FA result card ── */}
      {result.faResult != null && (() => {
        const { loadings, communalities, variance, featureNames } = result.faResult;
        const nFactors = variance.length;
        const totalVar = (variance.reduce((a, b) => a + b, 0) * 100).toFixed(1);
        return (
          <RepulsionCard style={{ ...CARD, borderColor: `${accent}22` }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>Factor Analysis</span>
              <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                {nFactors} factors · {totalVar}% total variance
              </span>
            </div>

            {/* Variance bars per factor */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
              {variance.map((v, c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: accent, width: 52, flexShrink: 0 }}>
                    F{c + 1}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{
                      height: "100%", borderRadius: 9999,
                      width: `${Math.max(v * 100, 1)}%`,
                      background: accent, opacity: 0.8, transition: "width 0.4s",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.73rem", color: "var(--text3)", width: 44, textAlign: "right", flexShrink: 0 }}>
                    {(v * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Loadings table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ tableLayout: "auto", width: "100%", borderCollapse: "collapse", fontSize: "0.73rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.3rem 0.5rem", color: "var(--text3)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      Feature
                    </th>
                    {Array.from({ length: nFactors }, (_, c) => (
                      <th key={c} style={{ textAlign: "center", padding: "0.3rem 0.5rem", color: accent, fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 56 }}>
                        F{c + 1}
                      </th>
                    ))}
                    <th style={{ textAlign: "center", padding: "0.3rem 0.5rem", color: "var(--text3)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.07)", minWidth: 52 }}>
                      h²
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureNames.map((name, j) => (
                    <tr key={name} style={{ background: j % 2 === 0 ? "rgba(255,255,255,0.02)" : undefined }}>
                      <td style={{ padding: "0.3rem 0.5rem", color: "var(--text)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>
                        {name}
                      </td>
                      {loadings[j].map((l, c) => {
                        const abs = Math.abs(l);
                        const color = abs > 0.5 ? "#fb923c" : abs > 0.3 ? "var(--text)" : "var(--text3)";
                        const bold = abs > 0.5 ? 700 : 400;
                        return (
                          <td key={c} style={{ textAlign: "center", padding: "0.3rem 0.5rem", color, fontWeight: bold }}>
                            {l >= 0 ? "+" : ""}{l.toFixed(2)}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "center", padding: "0.3rem 0.5rem", color: "var(--text3)" }}>
                        {communalities[j].toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.faResult.points.length >= 2 && (
              <FSProjectedScatter points={result.faResult.points} xLabel="Factor 1" yLabel="Factor 2" accent={accent} />
            )}
            <div style={{ marginTop: "0.85rem" }}>
              <button
                onClick={onDownloadFA}
                style={{
                  padding: "0.5rem 1.2rem", background: accent, border: "none", borderRadius: 8,
                  color: "#000", fontWeight: 700, fontSize: "0.82rem",
                  cursor: "pointer", boxShadow: `0 0 12px ${accent}44`,
                }}
              >
                Download FA Loadings CSV
              </button>
            </div>
          </RepulsionCard>
        );
      })()}

      {/* ── LDA result card ── */}
      {result.ldaResult != null && (() => {
        const { points, variance: ldaVar, featureWeights, featureNames, targetValues } = result.ldaResult;
        const nComp = ldaVar.length;
        const classes = [...new Set(targetValues.filter(Boolean))].sort();

        // Top-5 features by |weight| for LD1
        const ld1Weights = featureWeights[0] ?? [];
        const topFeatures = featureNames
          .map((name, j) => ({ name, w: ld1Weights[j] ?? 0 }))
          .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
          .slice(0, 5);

        // Actual number of dimensions in the projected points
        const actualDims = points[0]?.length ?? 0;

        // Build scatter-compatible structure for UMAPScatter (2D or 3D)
        const scatterResult = {
          nComponents: Math.min(actualDims, 3) as 2 | 3,
          csvText: "",
          points,
        };

        // ── 1D histogram helpers ──
        const colorMap1D = new Map<string, string>();
        classes.forEach((cls, i) => colorMap1D.set(String(cls), CLASS_COLORS[i % CLASS_COLORS.length]));
        const ld1Vals = points.map(p => p[0] ?? 0).filter((_, i) => targetValues[i] !== "");
        const ld1Min = Math.min(...ld1Vals);
        const ld1Max = Math.max(...ld1Vals);
        const ld1Range = ld1Max - ld1Min || 1;
        const HIST_W = 480, HIST_H = 120, HIST_PAD_X = 32, HIST_PAD_Y = 20;
        // Seeded jitter per point (deterministic based on index)
        const jitter = (i: number) => ((i * 2654435761) % 1000) / 1000;

        return (
          <RepulsionCard style={{ ...CARD, borderColor: `${accent}22` }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>Linear Discriminant Analysis</span>
              <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                {nComp} discriminant{nComp !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Discriminant variance bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
              {ldaVar.map((v, c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: accent, width: 52, flexShrink: 0 }}>
                    LD{c + 1}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{
                      height: "100%", borderRadius: 9999,
                      width: `${Math.max(v * 100, 1)}%`,
                      background: accent, opacity: 0.8, transition: "width 0.4s",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.73rem", color: "var(--text3)", width: 44, textAlign: "right", flexShrink: 0 }}>
                    {(v * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* 3D or 2D scatter coloured by class */}
            {actualDims >= 2 && (
              <>
                <UMAPScatter
                  umapResult={scatterResult}
                  accent={accent}
                  labelValues={targetValues.map(String)}
                />
                {/* Class colour legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
                  {classes.map((cls, i) => (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: CLASS_COLORS[i % CLASS_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{cls}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 1D histogram — binary target gives exactly 1 component */}
            {actualDims === 1 && (
              <>
                <div style={{ fontSize: "0.74rem", color: "var(--text3)", marginBottom: "0.35rem", fontWeight: 600 }}>
                  LD1 projection
                </div>
                <svg
                  viewBox={`0 0 ${HIST_W} ${HIST_H}`}
                  style={{ width: "100%", height: "auto", display: "block", marginBottom: "0.4rem" }}
                >
                  {/* Horizontal axis line */}
                  <line
                    x1={HIST_PAD_X} y1={HIST_H - HIST_PAD_Y}
                    x2={HIST_W - HIST_PAD_X} y2={HIST_H - HIST_PAD_Y}
                    stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                  />
                  {/* Tick labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const x = HIST_PAD_X + t * (HIST_W - HIST_PAD_X * 2);
                    const val = (ld1Min + t * ld1Range).toFixed(2);
                    return (
                      <text key={t} x={x} y={HIST_H - 4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.35)">
                        {val}
                      </text>
                    );
                  })}
                  {/* Points with vertical jitter */}
                  {points.map((p, i) => {
                    const label = targetValues[i];
                    if (!label) return null;
                    const cx = HIST_PAD_X + ((p[0] - ld1Min) / ld1Range) * (HIST_W - HIST_PAD_X * 2);
                    const jitterFrac = jitter(i);
                    const usableH = HIST_H - HIST_PAD_Y - 12;
                    const cy = 8 + jitterFrac * usableH;
                    const fill = colorMap1D.get(String(label)) ?? accent;
                    return (
                      <circle
                        key={i}
                        cx={cx} cy={cy} r={1.5}
                        fill={fill} fillOpacity={0.75}
                        stroke="rgba(0,0,0,0.3)" strokeWidth={0.5}
                      />
                    );
                  })}
                </svg>
                {/* Class colour legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {classes.map((cls, i) => (
                    <div key={cls} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: CLASS_COLORS[i % CLASS_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{cls}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Top-5 feature weights for LD1 */}
            <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text3)", marginBottom: "0.4rem" }}>
              Top feature weights (LD1)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" }}>
              {topFeatures.map(({ name, w }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.73rem", color: "var(--text)", width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>
                    {name}
                  </span>
                  <div style={{ flex: 1, height: 5, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{
                      height: "100%", borderRadius: 9999,
                      width: `${Math.min(Math.abs(w) * 100, 100)}%`,
                      background: w >= 0 ? accent : "#60a5fa",
                      transition: "width 0.4s",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.71rem", color: w >= 0 ? accent : "#60a5fa", width: 52, textAlign: "right", flexShrink: 0 }}>
                    {w >= 0 ? "+" : ""}{w.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onDownloadLDA}
              style={{
                padding: "0.5rem 1.2rem", background: accent, border: "none", borderRadius: 8,
                color: "#000", fontWeight: 700, fontSize: "0.82rem",
                cursor: "pointer", boxShadow: `0 0 12px ${accent}44`,
              }}
            >
              Download LDA CSV
            </button>
          </RepulsionCard>
        );
      })()}
    </>
  );
}