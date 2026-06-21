"use client";

import { useState } from "react";
import { PCAScreeChart } from "@/components/FSCharts";
import UMAPScatter from "@/components/UMAPScatter";
import RepulsionCard from "@/components/RepulsionCard";
import type { SelectionResult, SelectionOpts, PCAComponent } from "@/lib/fsAlgorithms";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

interface Props {
  result: SelectionResult;
  opts: SelectionOpts;
  accent: string;
  onDownloadPCA: () => void;
}

export default function FSPCACard({ result, opts, accent, onDownloadPCA }: Props) {
  const [view, setView] = useState<"2d" | "3d">("2d");

  if (!result.pcaResult) return null;

  const { components } = result.pcaResult;
  const lastComp = components[components.length - 1];
  const has3D = result.pcaResult.points[0]?.z !== undefined;

  return (
    <RepulsionCard style={{ ...CARD, borderColor: `${accent}22` }}>
      <div style={{ marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>PCA Components</span>
        <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
          {components.length} components · {((lastComp?.cumulativeVariance ?? 0) * 100).toFixed(1)}% total variance explained
        </span>
      </div>
      <PCAScreeChart components={components} accent={accent} />

      {/* 2D / 3D toggle — only when 3+ components */}
      {has3D && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
          {(["2d", "3d"] as const).map(mode => (
            <button key={mode} onClick={() => setView(mode)} style={{
              padding: "0.35rem 1rem", borderRadius: 6, cursor: "pointer",
              fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
              border: `1px solid ${view === mode ? accent : "rgba(255,255,255,0.12)"}`,
              background: view === mode ? `${accent}18` : "rgba(0,0,0,0.2)",
              color: view === mode ? accent : "var(--text3)",
            }}>
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Scatter */}
      {(() => {
        const pts = result.pcaResult!.points;
        const use3D = has3D && view === "3d";
        const pcaScatter = {
          nComponents: (use3D ? 3 : 2) as 2 | 3,
          csvText: "",
          points: pts.map(p => use3D ? [p.x, p.y, p.z ?? 0] : [p.x, p.y]),
        };
        const targetValues = pts.map(p => p.label);
        return (
          <>
            <UMAPScatter
              umapResult={pcaScatter}
              accent={accent}
              labelValues={targetValues}
              axisPrefix="PC"
            />
            {has3D && view === "3d" && (
              <div style={{ fontSize: "0.70rem", color: "var(--text3)", marginTop: "0.35rem", lineHeight: 1.5 }}>
                3D view uses the first 3 principal components. Drag to rotate, scroll to zoom.
                Only available when 3+ components are computed.
              </div>
            )}
          </>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", marginTop: "1rem" }}>
        {components.map((comp: PCAComponent) => (
          <div key={comp.index} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: accent, width: 36, flexShrink: 0 }}>
              PC{comp.index}
            </span>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
              <div style={{
                height: "100%", borderRadius: 9999,
                width: `${Math.max(comp.varianceExplained * 100, 1)}%`,
                background: accent, opacity: 0.8,
                transition: "width 0.4s",
              }} />
            </div>
            <span style={{ fontSize: "0.73rem", color: "var(--text3)", width: 44, textAlign: "right", flexShrink: 0 }}>
              {(comp.varianceExplained * 100).toFixed(1)}%
            </span>
            <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Top: {comp.topLoadings[0]?.name} ({comp.topLoadings[0]?.loading > 0 ? "+" : ""}{comp.topLoadings[0]?.loading.toFixed(2)})
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onDownloadPCA}
        style={{
          padding: "0.5rem 1.2rem", background: accent, border: "none", borderRadius: 8,
          color: "#000", fontWeight: 700, fontSize: "0.82rem",
          cursor: "pointer", boxShadow: `0 0 12px ${accent}44`,
        }}
      >
        Download PCA CSV
      </button>
    </RepulsionCard>
  );
}
