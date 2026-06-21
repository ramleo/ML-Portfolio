"use client";

import React, { useState } from "react";
import { ColInfo } from "@/lib/feAlgorithms";
import { LDATopicResult } from "@/lib/feLDA";

const ACCENT  = "#38bdf8";
const PURPLE  = "#a78bfa";
const GREEN   = "#34d399";

// Topic colour palette (one per topic slot, cycles if > 10)
const TOPIC_COLORS = [
  "#38bdf8", "#a78bfa", "#34d399", "#f59e0b",
  "#f87171", "#e879f9", "#fb923c", "#22d3ee",
  "#4ade80", "#facc15",
];

const INPUT_STYLE: React.CSSProperties = {
  width: 62,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 5,
  color: "var(--text)",
  fontSize: "0.78rem",
  padding: "0.25rem 0.35rem",
  outline: "none",
  textAlign: "center",
};

const SELECT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.78rem",
  padding: "0.35rem 0.4rem",
  outline: "none",
};

export interface LDAPanelProps {
  catCols: ColInfo[];
  ldaCol: string;
  ldaNTopics: number;
  ldaNIter: number;
  ldaResult: LDATopicResult | null;
  ldaRunning: boolean;
  ldaError: string | null;
  onSetLdaCol: (col: string) => void;
  onSetLdaNTopics: (n: number) => void;
  onSetLdaNIter: (n: number) => void;
  onRunLDA: () => void;
}

export default function LDAPanel({
  catCols,
  ldaCol,
  ldaNTopics,
  ldaNIter,
  ldaResult,
  ldaRunning,
  ldaError,
  onSetLdaCol,
  onSetLdaNTopics,
  onSetLdaNIter,
  onRunLDA,
}: LDAPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: "rgba(14,22,40,0.72)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "1.25rem 1.4rem",
    }}>
      {/* Header — full row is clickable */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? "0.9rem" : 0, cursor: "pointer", userSelect: "none" }}
      >
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Text — LDA Topic Model
          </div>
          {ldaResult && (
            <div style={{ fontSize: "0.63rem", color: GREEN, marginTop: "0.15rem" }}>
              {ldaResult.nTopics} topics extracted → {ldaResult.topicColumns.map(c => c.name).join(", ")}
            </div>
          )}
        </div>
        <span style={{ color: "var(--text3)", fontSize: "0.75rem", padding: "2px 6px", pointerEvents: "none" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <>
          {/* Description */}
          <div style={{ fontSize: "0.71rem", color: "var(--text3)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Discovers hidden topics in a text column using Latent Dirichlet Allocation (Gibbs Sampling).
            Outputs one probability column per topic.{" "}
            <span style={{ color: `${ACCENT}99`, fontStyle: "italic" }}>
              Best with 50+ rows of meaningful text.
            </span>
          </div>

          {/* Column selector */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.28rem" }}>Text column</div>
            {catCols.length === 0 ? (
              <div style={{ fontSize: "0.71rem", color: "#f87171" }}>No string/categorical columns found in dataset.</div>
            ) : (
              <select
                value={ldaCol}
                onChange={e => onSetLdaCol(e.target.value)}
                style={{ ...SELECT_STYLE, width: "100%" }}>
                <option value="">— select a text column —</option>
                {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Parameters */}
          <div style={{ display: "flex", gap: "1.2rem", alignItems: "flex-end", marginBottom: "0.9rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Topics (K)</div>
              <input
                type="number" min={2} max={20} value={ldaNTopics}
                onChange={e => onSetLdaNTopics(Math.min(20, Math.max(2, parseInt(e.target.value) || 5)))}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Iterations</div>
              <input
                type="number" min={10} max={200} value={ldaNIter}
                onChange={e => onSetLdaNIter(Math.min(200, Math.max(10, parseInt(e.target.value) || 50)))}
                style={INPUT_STYLE}
              />
            </div>
            <button
              onClick={onRunLDA}
              disabled={!ldaCol || ldaRunning}
              style={{
                padding: "0.42rem 1.1rem", borderRadius: 9999, fontWeight: 600,
                fontSize: "0.78rem", cursor: (!ldaCol || ldaRunning) ? "not-allowed" : "pointer",
                border: `1px solid ${!ldaCol || ldaRunning ? "rgba(255,255,255,0.1)" : PURPLE}`,
                background: !ldaCol || ldaRunning ? "rgba(255,255,255,0.04)" : "rgba(167,139,250,0.12)",
                color: !ldaCol || ldaRunning ? "var(--text3)" : PURPLE,
                transition: "all 0.15s",
              }}>
              {ldaRunning ? "Running…" : "Run LDA"}
            </button>
          </div>

          {/* Error */}
          {ldaError && (
            <div style={{ fontSize: "0.68rem", color: "#f87171", marginBottom: "0.6rem" }}>{ldaError}</div>
          )}

          {/* Results: top words per topic as coloured chips */}
          {ldaResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {ldaResult.topWords.map(({ topic, words }) => {
                const color = TOPIC_COLORS[topic % TOPIC_COLORS.length];
                return (
                  <div key={topic}>
                    <div style={{ fontSize: "0.63rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.28rem" }}>
                      Topic {topic} → <span style={{ fontFamily: "monospace", fontWeight: 500 }}>lda_topic_{topic}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {words.map(w => (
                        <span key={w} style={{
                          fontSize: "0.68rem", fontWeight: 500,
                          color, background: `${color}12`,
                          border: `1px solid ${color}35`,
                          borderRadius: 9999, padding: "1px 8px",
                        }}>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}