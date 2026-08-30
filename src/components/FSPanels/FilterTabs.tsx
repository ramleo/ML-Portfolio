"use client";

import type { SelectionOpts, ColInfo } from "@/lib/fsAlgorithms";

const ACCENT = "#a9652d";

interface FilterTabsProps {
  opts: SelectionOpts;
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>;
  candidateCount: number;
  numericCols: ColInfo[];
  activeTab: string;
}

export default function FilterTabs({ opts, setOpts, candidateCount, numericCols, activeTab }: FilterTabsProps) {
  if (activeTab === "variance") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useVariance}
            onChange={e => setOpts(o => ({ ...o, useVariance: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable variance threshold</span>
        </label>
        <div style={{ opacity: opts.useVariance ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Threshold</span>
            <input
              type="number" min="0" step="0.001"
              value={opts.varianceThreshold}
              onChange={e => setOpts(o => ({ ...o, varianceThreshold: Math.max(0, parseFloat(e.target.value) || 0) }))}
              disabled={!opts.useVariance}
              style={{
                width: 110, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, color: ACCENT, fontSize: "0.84rem", fontWeight: 700,
                padding: "0.3rem 0.6rem", outline: "none",
              }}
            />
          </div>
          {candidateCount > 0 && (
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.6rem" }}>
              Would drop{" "}
              <strong style={{ color: "var(--text)" }}>
                {numericCols.filter(c => c.variance < opts.varianceThreshold && c.name !== opts.targetCol).length}
              </strong>{" "}of{" "}
              <strong style={{ color: "var(--text)" }}>{candidateCount}</strong>{" "}
              numeric features · range:{" "}
              {candidateCount > 0
                ? `${Math.min(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)} – ${Math.max(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)}`
                : "—"}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "correlation") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useCorrelation}
            onChange={e => setOpts(o => ({ ...o, useCorrelation: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable correlation filter</span>
        </label>
        <div style={{ opacity: opts.useCorrelation ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0, width: 52 }}>|r| &ge;</span>
            <input
              type="range" min="0.5" max="1.0" step="0.01"
              value={opts.corrThreshold}
              onChange={e => setOpts(o => ({ ...o, corrThreshold: parseFloat(e.target.value) }))}
              disabled={!opts.useCorrelation}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.corrThreshold.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "topk") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useTopK}
            onChange={e => setOpts(o => ({ ...o, useTopK: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable top-K by MI score</span>
        </label>
        <div style={{ opacity: opts.useTopK ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.topK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, topK: parseInt(e.target.value) }))}
              disabled={!opts.useTopK}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.topK, Math.max(candidateCount, 1))} features
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
