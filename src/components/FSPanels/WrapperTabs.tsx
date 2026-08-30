"use client";

import type { SelectionOpts } from "@/lib/fsAlgorithms";

const ACCENT = "#a9652d";

interface WrapperTabsProps {
  opts: SelectionOpts;
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>;
  candidateCount: number;
  activeTab: string;
}

export default function WrapperTabs({ opts, setOpts, candidateCount, activeTab }: WrapperTabsProps) {
  if (activeTab === "rfe") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useRFE}
            onChange={e => setOpts(o => ({ ...o, useRFE: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Recursive Feature Elimination</span>
        </label>
        <div style={{ opacity: opts.useRFE ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, rfeTargetK: parseInt(e.target.value) }))}
              disabled={!opts.useRFE}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))} features
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
            Results show the elimination round for each dropped feature in the ranking table.
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "lasso") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useLasso}
            onChange={e => setOpts(o => ({ ...o, useLasso: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Lasso (L1)</span>
        </label>
        <div style={{ opacity: opts.useLasso ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Alpha</span>
            <input
              type="range" min="0.001" max="0.2" step="0.001"
              value={opts.lassoAlpha}
              onChange={e => setOpts(o => ({ ...o, lassoAlpha: parseFloat(e.target.value) }))}
              disabled={!opts.useLasso}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 52, textAlign: "right" }}>
              {opts.lassoAlpha.toFixed(2)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.lassoTopK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, lassoTopK: parseInt(e.target.value) }))}
              disabled={!opts.useLasso}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.lassoTopK, Math.max(candidateCount, 1))} features
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

  if (activeTab === "ridge") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useRidge}
            onChange={e => setOpts(o => ({ ...o, useRidge: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Ridge (L2)</span>
        </label>
        <div style={{ opacity: opts.useRidge ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Alpha</span>
            <input
              type="range" min="0.1" max="10" step="0.1"
              value={opts.ridgeAlpha}
              onChange={e => setOpts(o => ({ ...o, ridgeAlpha: parseFloat(e.target.value) }))}
              disabled={!opts.useRidge}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.ridgeAlpha.toFixed(1)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.ridgeTopK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, ridgeTopK: parseInt(e.target.value) }))}
              disabled={!opts.useRidge}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.ridgeTopK, Math.max(candidateCount, 1))} features
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

  if (activeTab === "tree") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useTree}
            onChange={e => setOpts(o => ({ ...o, useTree: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Tree Importance</span>
        </label>
        <div style={{ opacity: opts.useTree ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>N trees</span>
            <input
              type="range" min="10" max="200" step="10"
              value={opts.treeNTrees}
              onChange={e => setOpts(o => ({ ...o, treeNTrees: parseInt(e.target.value) }))}
              disabled={!opts.useTree}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
              {opts.treeNTrees}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.treeTopK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, treeTopK: parseInt(e.target.value) }))}
              disabled={!opts.useTree}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.treeTopK, Math.max(candidateCount, 1))} features
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

  if (activeTab === "forward") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useForward}
            onChange={e => setOpts(o => ({ ...o, useForward: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Forward Selection</span>
        </label>
        <div style={{ opacity: opts.useForward ? 1 : 0.4, transition: "opacity 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep</span>
            <input
              type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
              value={Math.min(opts.forwardK, Math.max(candidateCount, 1))}
              onChange={e => setOpts(o => ({ ...o, forwardK: parseInt(e.target.value) }))}
              disabled={!opts.useForward}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.forwardK, Math.max(candidateCount, 1))} features
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "exhaustive") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
          <input type="checkbox" checked={opts.useExhaustive}
            onChange={e => setOpts(o => ({ ...o, useExhaustive: e.target.checked }))} />
          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Exhaustive Search</span>
        </label>
        <div style={{ opacity: opts.useExhaustive ? 1 : 0.4, transition: "opacity 0.15s" }}>
          {candidateCount > 15 && (
            <div style={{ fontSize: "0.76rem", color: "#fbbf24", marginBottom: "0.75rem", lineHeight: 1.55 }}>
              Current dataset has {candidateCount} numeric candidates — will use Forward Selection fallback (feasibility cap is 15).
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Best subset of</span>
            <input
              type="range" min="2" max={Math.min(Math.max(candidateCount, 2), 15, 12)} step="1"
              value={Math.min(opts.exhaustiveK, Math.min(Math.max(candidateCount, 2), 15, 12))}
              onChange={e => setOpts(o => ({ ...o, exhaustiveK: parseInt(e.target.value) }))}
              disabled={!opts.useExhaustive}
              style={{ flex: 1, accentColor: ACCENT }}
            />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
              {Math.min(opts.exhaustiveK, Math.min(Math.max(candidateCount, 2), 15, 12))} features
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}