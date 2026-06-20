"use client";

import { ACCENT, type SavedRun, type TrainResult, type Step } from "@/lib/automlUtils";

interface Props {
  savedRuns:         SavedRun[];
  expandedDatasets:  Set<string>;
  onToggleDataset:   (name: string) => void;
  onLoadRun:         (run: SavedRun) => void;
  onDeleteRun:       (id: string) => void;
}

export default function SavedRunsView({
  savedRuns, expandedDatasets, onToggleDataset, onLoadRun, onDeleteRun,
}: Props) {
  if (savedRuns.length === 0) {
    return (
      <div style={{ textAlign: "center" as const, padding: "3rem 0", color: "var(--text3)", fontSize: "0.82rem" }}>
        No saved runs yet. Run AutoML and click "Save Version" to save a result.
      </div>
    );
  }

  const grouped = savedRuns.reduce<Record<string, SavedRun[]>>((acc, r) => {
    (acc[r.datasetName] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Object.entries(grouped).map(([dataset, runs]) => {
        const isOpen = expandedDatasets.has(dataset);
        return (
          <div key={dataset} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
            <button
              onClick={() => onToggleDataset(dataset)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.65rem 0.9rem", background: "var(--bg-glass)",
                border: "none", cursor: "pointer", gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>
                  <polyline points="2,2 7,5 2,8" />
                </svg>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>{dataset}</span>
              </div>
              <span style={{ fontSize: "0.68rem", color: runs.length >= 5 ? "#f87171" : "var(--text3)", fontVariantNumeric: "tabular-nums" }}>
                {runs.length} / 5
              </span>
            </button>
            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {runs.map(run => (
                  <div key={run.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.55rem 0.9rem", borderBottom: "1px solid var(--border)",
                    background: "transparent",
                  }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text3)", width: 42, flexShrink: 0 }}>Run {run.runNumber}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", flex: 1 }}>{run.winner}</span>
                    <span style={{ fontSize: "0.75rem", fontVariantNumeric: "tabular-nums", color: ACCENT, fontWeight: 600 }}>{run.score}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 36, textAlign: "right" as const, flexShrink: 0 }}>{run.date}</span>
                    <button
                      onClick={() => onLoadRun(run)}
                      style={{
                        padding: "0.2rem 0.6rem", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                        background: "transparent", border: `1px solid ${ACCENT}44`,
                        color: ACCENT, fontSize: "0.68rem", fontWeight: 600,
                      }}
                    >Load</button>
                    <button
                      onClick={() => onDeleteRun(run.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: "0 2px", flexShrink: 0 }}
                      title="Delete"
                    >
                      <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
