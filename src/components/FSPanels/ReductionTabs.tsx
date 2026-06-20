"use client";

import type { SelectionOpts } from "@/lib/fsAlgorithms";

const ACCENT = "#fb923c";

interface ReductionTabsProps {
  opts: SelectionOpts;
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>;
  candidateCount: number;
  activeTab: string;
}

export default function ReductionTabs({ opts, setOpts, candidateCount, activeTab }: ReductionTabsProps) {
  if (activeTab === "pca") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.usePCA}
            onChange={e => setOpts(o => ({ ...o, usePCA: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable PCA</span>
        </label>
        <div style={{ opacity: opts.usePCA ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Components</span>
            <input
              type="range" min="1" max={Math.min(Math.max(candidateCount, 1), 10)} step="1"
              value={Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
              onChange={e => setOpts(o => ({ ...o, pcaComponents: parseInt(e.target.value) }))}
              disabled={!opts.usePCA}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
            PCA and UMAP produce a separate transformed CSV downloadable below after running.
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "umap") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useUMAP}
            onChange={e => setOpts(o => ({ ...o, useUMAP: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable UMAP (spectral)</span>
        </label>
        <div style={{ opacity: opts.useUMAP ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Dimensions</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {([2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setOpts(o => ({ ...o, umapComponents: n }))}
                  disabled={!opts.useUMAP}
                  style={{
                    padding: "0.35rem 1rem", borderRadius: 6, cursor: "pointer",
                    fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
                    border: `1px solid ${opts.umapComponents === n ? ACCENT : "rgba(255,255,255,0.12)"}`,
                    background: opts.umapComponents === n ? `${ACCENT}18` : "rgba(0,0,0,0.2)",
                    color: opts.umapComponents === n ? ACCENT : "var(--text3)",
                  }}
                >
                  {n}D
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>k neighbours</span>
            <input
              type="range" min="5" max="30" step="1"
              value={opts.umapNeighbors}
              onChange={e => setOpts(o => ({ ...o, umapNeighbors: parseInt(e.target.value) }))}
              disabled={!opts.useUMAP}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.umapNeighbors}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
            Browser approximation — not the full UMAP algorithm but captures similar non-linear structure.
          </div>
        </div>
      </div>
    );
  }

  return null;
}