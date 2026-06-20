"use client";

import type { SelectionOpts, KBestMethod } from "@/lib/fsAlgorithms";

const ACCENT = "#fb923c";

interface ScoreTabsProps {
  opts: SelectionOpts;
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>;
  candidateCount: number;
  activeTab: string;
}

export default function ScoreTabs({ opts, setOpts, candidateCount, activeTab }: ScoreTabsProps) {
  if (activeTab === "selectkbest") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useSelectKBest}
            onChange={e => setOpts(o => ({ ...o, useSelectKBest: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Select K Best</span>
        </label>
        <div style={{ opacity: opts.useSelectKBest ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Scoring function</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {([
                { id: "f_regression", label: "f_regression", desc: "F(1,n-2) stat for linear association · numeric target" },
                { id: "f_classif",    label: "f_classif",    desc: "One-way ANOVA F-stat · categorical target" },
                { id: "mi",           label: "mutual_info",  desc: "MI approximation via Pearson correlation · any target" },
              ] as { id: KBestMethod; label: string; desc: string }[]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setOpts(o => ({ ...o, kBestMethod: m.id }))}
                  disabled={!opts.useSelectKBest}
                  title={m.desc}
                  style={{
                    padding: "0.35rem 0.8rem", borderRadius: 6, cursor: "pointer",
                    fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
                    border: `1px solid ${opts.kBestMethod === m.id ? ACCENT : "rgba(255,255,255,0.12)"}`,
                    background: opts.kBestMethod === m.id ? `${ACCENT}18` : "rgba(0,0,0,0.2)",
                    color: opts.kBestMethod === m.id ? ACCENT : "var(--text3)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "0.71rem", color: "var(--text3)", marginTop: "0.4rem" }}>
              {opts.kBestMethod === "f_regression" && "F = r² × (n-2) / (1-r²) — measures linear association strength with a numeric target."}
              {opts.kBestMethod === "f_classif" && "One-way ANOVA: between-class SS / within-class SS — measures how well a feature separates class groups."}
              {opts.kBestMethod === "mi" && "MI ≈ −0.5 × log(1 − r²) — information-theoretic score, works for any target type."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep best</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.selectKBestK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, selectKBestK: parseInt(e.target.value) }))}
              disabled={!opts.useSelectKBest}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.selectKBestK, Math.max(candidateCount, 1))} features
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.5rem" }}>
            Results show normalized F/MI scores as a secondary bar in the ranking table.
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "kendall") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useKendall}
            onChange={e => setOpts(o => ({ ...o, useKendall: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Kendall&apos;s Tau Filter</span>
        </label>
        <div style={{ opacity: opts.useKendall ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.kendallTopK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, kendallTopK: parseInt(e.target.value) }))}
              disabled={!opts.useKendall}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.kendallTopK, Math.max(candidateCount, 1))} features
            </span>
          </div>
          {!opts.targetCol && (
            <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
              Select a target column for meaningful scores.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "chisq") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useChiSq}
            onChange={e => setOpts(o => ({ ...o, useChiSq: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Chi-squared Filter</span>
        </label>
        <div style={{ opacity: opts.useChiSq ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.chiSqTopK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, chiSqTopK: parseInt(e.target.value) }))}
              disabled={!opts.useChiSq}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.chiSqTopK, Math.max(candidateCount, 1))} features
            </span>
          </div>
          {!opts.targetCol && (
            <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.5rem" }}>
              Select a target column for meaningful scores.
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}