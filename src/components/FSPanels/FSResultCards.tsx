"use client";

import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import { ScoreComparisonChart } from "@/components/FSCharts";
import UMAPScatter from "@/components/UMAPScatter";
import RepulsionCard from "@/components/RepulsionCard";
import FSPCACard from "@/components/FSPanels/FSPCACard";
import type { ColInfo, SelectionOpts, FeatureScore, SelectionResult } from "@/lib/fsAlgorithms";

const ACCENT = "#fb923c";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

interface FSResultCardsProps {
  result: SelectionResult;
  cols: ColInfo[];
  opts: SelectionOpts;
  numericCols: ColInfo[];
  categoricalCols: ColInfo[];
  fileName: string;
  rowCount: number;
  accent?: string;
  onDownload: () => void;
  onDownloadPCA: () => void;
  onDownloadUMAP: () => void;
}

export default function FSResultCards({
  result,
  cols,
  opts,
  numericCols,
  categoricalCols,
  fileName,
  rowCount,
  accent = ACCENT,
  onDownload,
  onDownloadPCA,
  onDownloadUMAP,
}: FSResultCardsProps) {
  return (
    <>
      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Input Features", value: String(result.features.length) },
          { label: "Features Kept", value: String(result.keptCount), accentVal: true },
          { label: "Features Dropped", value: String(result.droppedCount) },
          {
            label: "Reduction",
            value: result.features.length > 0
              ? `${Math.round((result.droppedCount / result.features.length) * 100)}%`
              : "0%",
          },
        ].map(s => (
          <RepulsionCard key={s.label} style={{ ...CARD, textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accentVal ? accent : "var(--text)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
          </RepulsionCard>
        ))}
      </div>

      {/* ── Rankings ── */}
      <RepulsionCard style={{ ...CARD }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>Feature Rankings</span>
          {/* Live count badge — always shown when result exists */}
          <span style={{
            fontSize: "0.68rem", fontWeight: 700, color: accent,
            background: `${accent}14`, border: `1px solid ${accent}30`,
            borderRadius: 9999, padding: "2px 10px",
          }}>
            {result.keptCount} kept · {result.droppedCount} dropped
          </span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { color: "#fb923c", label: "MI Score", show: true },
              { color: "#a78bfa", label: "F/KBest", show: result.kBestActive },
              { color: "#f97316", label: "Lasso", show: result.lassoActive },
              { color: "#6366f1", label: "Ridge", show: result.ridgeActive },
              { color: "#34d399", label: "Tree", show: result.treeActive },
            ].filter(m => m.show).map(m => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{m.label}</span>
              </div>
            ))}
            <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginLeft: "0.25rem" }}>· high → low</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {result.features.map((f: FeatureScore) => {
            const colVariance = cols.find(c => c.name === f.name)?.variance;
            return (
              <div key={f.name} style={{ opacity: f.kept ? 1 : 0.45, background: f.kept ? `${accent}07` : undefined, borderRadius: 6, padding: "0.15rem 0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {/* kept/dropped indicator */}
                  {f.kept ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                      <polyline points="2,6 5,9 10,3" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, display: "block" }}>
                      <line x1="3" y1="3" x2="9" y2="9" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="9" y1="3" x2="3" y2="9" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                  <span
                    title={f.name}
                    style={{
                      width: 200, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)",
                      flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                    {/* MI bar */}
                    <div style={{ height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{
                        height: "100%", width: `${Math.max(f.score * 100, 2)}%`,
                        borderRadius: 9999,
                        background: f.kept ? accent : "#6b7280",
                        boxShadow: f.kept ? `0 0 6px ${accent}44` : "none",
                        transition: "width 0.4s",
                      }} />
                    </div>
                    {/* F/KBest bar */}
                    {result.kBestActive && f.fScore > 0 && (
                      <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{
                          height: "100%", width: `${Math.max(f.fScore * 100, 2)}%`,
                          borderRadius: 9999, background: "#a78bfa",
                          transition: "width 0.4s",
                        }} />
                      </div>
                    )}
                    {/* Lasso bar */}
                    {result.lassoActive && f.lassoScore > 0 && (
                      <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{
                          height: "100%", width: `${Math.max(f.lassoScore * 100, 2)}%`,
                          borderRadius: 9999, background: "#f97316",
                          transition: "width 0.4s",
                        }} />
                      </div>
                    )}
                    {/* Ridge bar */}
                    {result.ridgeActive && f.ridgeScore > 0 && (
                      <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{
                          height: "100%", width: `${Math.max(f.ridgeScore * 100, 2)}%`,
                          borderRadius: 9999, background: "#a78bfa",
                          transition: "width 0.4s",
                        }} />
                      </div>
                    )}
                    {/* Tree bar */}
                    {result.treeActive && f.treeScore > 0 && (
                      <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{
                          height: "100%", width: `${Math.max(f.treeScore * 100, 2)}%`,
                          borderRadius: 9999, background: "#34d399",
                          transition: "width 0.4s",
                        }} />
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600,
                    color: f.kept ? accent : "#6b7280",
                    width: 36, textAlign: "right", flexShrink: 0,
                  }}>
                    {f.score.toFixed(2)}
                  </span>
                  {colVariance !== undefined && (
                    <span style={{
                      fontSize: "0.67rem", color: "var(--text3)",
                      width: 60, textAlign: "right", flexShrink: 0,
                    }}>
                      {"σ²"}={colVariance < 0.01 ? colVariance.toExponential(1) : colVariance.toFixed(2)}
                    </span>
                  )}
                  {!f.kept && (
                    <span style={{
                      fontSize: "0.64rem", color: "#6b7280",
                      flexShrink: 0, width: 140, textAlign: "right",
                    }}>
                      {f.reasons.join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </RepulsionCard>

      {/* ── Method agreement — always render when any scoring method is active ── */}
      {(result.kBestActive || result.lassoActive || result.ridgeActive || result.treeActive) && (() => {
        const keptFeatures = result.features.filter(f => f.kept).slice(0, 15);
        const methods = [
          { key: "mi",    label: "MI",      score: (f: FeatureScore) => f.score > 0 },
          { key: "fk",    label: "F/KBest", score: (f: FeatureScore) => result.kBestActive && f.fScore > 0 },
          { key: "lasso", label: "Lasso",   score: (f: FeatureScore) => result.lassoActive && f.lassoScore > 0 },
          { key: "ridge", label: "Ridge",   score: (f: FeatureScore) => result.ridgeActive && f.ridgeScore > 0 },
          { key: "tree",  label: "Tree",    score: (f: FeatureScore) => result.treeActive && f.treeScore > 0 },
        ];
        const activeMethods = methods.filter(
          m => m.key === "mi"
            || (m.key === "fk"    && result.kBestActive)
            || (m.key === "lasso" && result.lassoActive)
            || (m.key === "ridge" && result.ridgeActive)
            || (m.key === "tree"  && result.treeActive),
        );
        if (keptFeatures.length === 0) return null;
        return (
          <RepulsionCard style={{ ...CARD }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem" }}>
              Method Agreement
              <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                which scoring methods agree on kept features
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse", fontSize: "0.74rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 160, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Feature</th>
                    {activeMethods.map(m => (
                      <th key={m.key} style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 60, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{m.label}</th>
                    ))}
                    <th style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: "var(--text3)", fontWeight: 600, width: 80, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Consensus</th>
                  </tr>
                </thead>
                <tbody>
                  {keptFeatures.map((f, i) => {
                    const agreed = activeMethods.filter(m => m.score(f)).length;
                    return (
                      <tr key={f.name} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : undefined }}>
                        <td style={{ padding: "0.35rem 0.5rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</td>
                        {activeMethods.map(m => (
                          <td key={m.key} style={{ textAlign: "center", padding: "0.35rem 0.5rem" }}>
                            {m.score(f)
                              ? <span style={{ color: "#4ade80", fontWeight: 700 }}>&#10003;</span>
                              : <span style={{ color: "#6b7280" }}>&#215;</span>}
                          </td>
                        ))}
                        <td style={{ textAlign: "center", padding: "0.35rem 0.5rem", color: agreed === activeMethods.length ? accent : "var(--text3)", fontWeight: agreed === activeMethods.length ? 700 : 400 }}>
                          {agreed}/{activeMethods.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </RepulsionCard>
        );
      })()}

      {/* ── Score comparison chart ── */}
      {result.features.length > 0 && (
        <RepulsionCard style={{ ...CARD }}>
          <ScoreComparisonChart features={result.features} result={result} accent={accent} />
        </RepulsionCard>
      )}

      {/* ── Correlation heatmap ── */}
      {numericCols.filter(c => c.name !== opts.targetCol).length >= 2 && (
        <RepulsionCard style={{ ...CARD }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.75rem" }}>
            Correlation Heatmap
          </div>
          <CorrelationHeatmap cols={numericCols.filter(c => c.name !== opts.targetCol)} accent={accent} />
        </RepulsionCard>
      )}

      {/* ── Download selected ── */}
      <RepulsionCard style={{
        ...CARD, background: `${accent}07`, borderColor: `${accent}22`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>
            Reduced Dataset Ready
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
            {result.keptCount} selected feature{result.keptCount !== 1 ? "s" : ""}
            {opts.targetCol ? " + target" : ""}
            {categoricalCols.filter(c => c.name !== opts.targetCol).length > 0
              ? ` + ${categoricalCols.filter(c => c.name !== opts.targetCol).length} categorical`
              : ""}
            {" "}· {rowCount.toLocaleString()} rows · CSV
          </div>
        </div>
        <button
          onClick={onDownload}
          style={{
            padding: "0.6rem 1.4rem", background: accent, border: "none", borderRadius: 8,
            color: "#000", fontWeight: 700, fontSize: "0.84rem",
            cursor: "pointer", boxShadow: `0 0 14px ${accent}44`,
          }}
        >
          Download CSV
        </button>
      </RepulsionCard>

      {/* ── PCA result card ── */}
      {result.pcaResult != null && (
        <FSPCACard result={result} opts={opts} accent={accent} onDownloadPCA={onDownloadPCA} />
      )}

      {/* ── UMAP result card ── */}
      {result.umapResult != null && (
        <RepulsionCard style={{ ...CARD, borderColor: `${accent}22` }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>UMAP Embedding</span>
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "1rem", lineHeight: 1.55 }}>
            {result.umapResult.nComponents}D spectral embedding
            {rowCount > 600
              ? ` · graph on 600 rows · ${(rowCount - 600).toLocaleString()} projected via kNN`
              : ` · all ${rowCount.toLocaleString()} rows used`}
          </div>
          <UMAPScatter
            umapResult={result.umapResult}
            accent={accent}
            labelValues={opts.targetCol
              ? cols.find(c => c.name === opts.targetCol)?.rawVals.map(String)
              : undefined}
          />
          <div style={{ marginTop: "1rem" }} />
          <button
            onClick={onDownloadUMAP}
            style={{
              padding: "0.5rem 1.2rem", background: accent, border: "none", borderRadius: 8,
              color: "#000", fontWeight: 700, fontSize: "0.82rem",
              cursor: "pointer", boxShadow: `0 0 12px ${accent}44`,
            }}
          >
            Download UMAP CSV
          </button>
        </RepulsionCard>
      )}
    </>
  );
}