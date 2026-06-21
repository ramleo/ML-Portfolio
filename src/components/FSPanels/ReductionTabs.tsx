"use client";

import type { SelectionOpts, ColInfo } from "@/lib/fsAlgorithms";

const ACCENT = "#fb923c";

interface ReductionTabsProps {
  opts: SelectionOpts;
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>;
  candidateCount: number;
  cols: ColInfo[];
  activeTab: string;
}

export default function ReductionTabs({ opts, setOpts, candidateCount, cols, activeTab }: ReductionTabsProps) {
  if (activeTab === "pca") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.usePCA}
            onChange={e => setOpts(o => ({ ...o, usePCA: e.target.checked }))} />
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Enable PCA</span>
        </label>
        <div style={{ opacity: opts.usePCA ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" checked={opts.pcaKaiser}
              onChange={e => setOpts(o => ({ ...o, pcaKaiser: e.target.checked }))}
              disabled={!opts.usePCA} />
            <span style={{ fontSize: "0.80rem", color: opts.pcaKaiser ? "#fb923c" : "var(--text2)" }}>
              Auto (Kaiser) — keep components with eigenvalue &gt; 1
            </span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", opacity: opts.pcaKaiser ? 0.35 : 1, transition: "opacity 0.15s" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Components</span>
            <input
              type="range" min="1" max={Math.min(Math.max(candidateCount, 1), 10)} step="1"
              value={Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
              onChange={e => setOpts(o => ({ ...o, pcaComponents: parseInt(e.target.value) }))}
              disabled={!opts.usePCA || opts.pcaKaiser}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.pcaKaiser ? "auto" : Math.min(opts.pcaComponents, Math.min(Math.max(candidateCount, 1), 10))}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: 1.55 }}>
            Components = number of principal axes to keep. Start with 2–3 for visualisation. Increase to capture more variance; decrease to compress more aggressively. Auto (Kaiser) picks the optimal count automatically.
            <br />PCA and UMAP produce a separate transformed CSV downloadable below after running.
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
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Enable UMAP (spectral)</span>
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
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
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

  if (activeTab === "fa") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useFA}
            onChange={e => setOpts(o => ({ ...o, useFA: e.target.checked }))} />
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Enable Factor Analysis</span>
        </label>
        <div style={{ opacity: opts.useFA ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Factors</span>
            <input
              type="range" min="1" max="10" step="1"
              value={opts.faFactors}
              onChange={e => setOpts(o => ({ ...o, faFactors: parseInt(e.target.value) }))}
              disabled={!opts.useFA}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.faFactors}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: 1.55 }}>
            Factors = number of latent variables to extract. Use 2 for a quick overview, 3+ to capture richer structure. Scatter plot shows 2D for 2 factors, 3D for 3+.
            <br />Finds latent factors explaining feature correlations. Uses iterated principal axis factoring on the correlation matrix.
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "lda") {
    const targetCol = cols.find(c => c.name === opts.targetCol);
    const nClasses = targetCol
      ? new Set(targetCol.rawVals.filter(Boolean)).size
      : 0;
    const maxLDA = Math.max(1, nClasses - 1);
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useLDA}
            onChange={e => setOpts(o => ({ ...o, useLDA: e.target.checked }))} />
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Enable LDA</span>
        </label>
        {!targetCol && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.72rem", fontWeight: 600, color: "#fbbf24",
            background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: 6, padding: "0.3rem 0.7rem", marginBottom: "0.75rem",
          }}>
            ⚠ LDA requires a categorical target column
          </div>
        )}
        <div style={{ opacity: opts.useLDA ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Components</span>
            <input
              type="range" min="1" max={maxLDA} step="1"
              value={Math.min(opts.ldaComponents, maxLDA)}
              onChange={e => setOpts(o => ({ ...o, ldaComponents: Math.min(parseInt(e.target.value), maxLDA) }))}
              disabled={!opts.useLDA}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {Math.min(opts.ldaComponents, maxLDA)}
            </span>
          </div>
          {nClasses > 0 && (
            <div style={{
              fontSize: "0.70rem", color: "var(--text3)", marginTop: "0.3rem",
              background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: "0.3rem 0.5rem",
            }}>
              {nClasses} class{nClasses !== 1 ? "es" : ""} detected → max {maxLDA} discriminant{maxLDA !== 1 ? "s" : ""} (classes − 1)
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
            Supervised — requires categorical target. Max components = number of classes − 1.
          </div>
          <div style={{ fontSize: "0.71rem", color: "var(--text3)", marginTop: "0.35rem", lineHeight: 1.55 }}>
            Components = discriminant axes to compute. Actual output is always capped at nClasses − 1 regardless of slider value.<br />
            Binary target → 1 component (1D histogram). 3 classes → max 2D scatter. 4+ classes → 3D scatter.
          </div>
        </div>
      </div>
    );
  }

  return null;
}