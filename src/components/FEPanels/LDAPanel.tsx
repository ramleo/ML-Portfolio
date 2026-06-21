"use client";

import React, { useState } from "react";
import { ColInfo } from "@/lib/feAlgorithms";
import { LDATopicResult } from "@/lib/feLDA";
import { LDAOpts } from "@/hooks/useFELDA";

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
  ldaOpts: LDAOpts;
  ldaResult: LDATopicResult | null;
  ldaRunning: boolean;
  ldaError: string | null;
  onSetLdaCol: (col: string) => void;
  onSetLdaNTopics: (n: number) => void;
  onSetLdaNIter: (n: number) => void;
  setLdaOpts: React.Dispatch<React.SetStateAction<LDAOpts>>;
  onRunLDA: () => void;
}

export default function LDAPanel({
  catCols,
  ldaCol,
  ldaNTopics,
  ldaNIter,
  ldaOpts,
  ldaResult,
  ldaRunning,
  ldaError,
  onSetLdaCol,
  onSetLdaNTopics,
  onSetLdaNIter,
  setLdaOpts,
  onRunLDA,
}: LDAPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [howOpen, setHowOpen] = useState(false);

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
          <div style={{ fontSize: "0.71rem", color: "var(--text3)", lineHeight: 1.6, marginBottom: "0.6rem" }}>
            Discovers hidden topics in a text column using Latent Dirichlet Allocation (Gibbs Sampling).
            Outputs one probability column per topic.{" "}
            <span style={{ color: `${ACCENT}99`, fontStyle: "italic" }}>
              Best with 50+ rows of meaningful text.
            </span>
            {" "}Default English stopwords are always applied; custom stopwords add to them.
          </div>

          {/* How LDA works — collapsible */}
          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setHowOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: "0.71rem", fontWeight: 600, color: "var(--text3)",
              }}
            >
              <span style={{ fontSize: "0.65rem" }}>{howOpen ? "▲" : "▶"}</span>
              How Latent Dirichlet Allocation works
            </button>
            {howOpen && (
              <div style={{
                marginTop: "0.5rem", padding: "0.75rem 0.9rem",
                borderLeft: `2px solid ${PURPLE}55`,
                background: "rgba(167,139,250,0.04)",
                borderRadius: "0 6px 6px 0",
                fontSize: "0.70rem", color: "var(--text3)", lineHeight: 1.65,
              }}>
                <strong style={{ color: "var(--text2)", display: "block", marginBottom: "0.4rem" }}>Full preprocessing + inference pipeline:</strong>
                <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <li><strong style={{ color: ACCENT }}>Build stopword set</strong> — built-in ~320 common English words (spaCy-equivalent: the, a, is, are, also, because, during, either…) are always removed. If you enter custom stopwords, they are merged on top. Default stopwords apply regardless.</li>
                  <li><strong style={{ color: ACCENT }}>Tokenize</strong> — each text cell is lowercased, all non-alphanumeric characters stripped, split on whitespace. Tokens shorter than 2 characters are dropped. Stopwords removed here.</li>
                  <li><strong style={{ color: ACCENT }}>Stemming</strong> (optional) — if enabled, common suffixes are stripped: <em>running → runn, classification → classif, happiness → happi, moved → mov</em>. Words ≤ 4 chars are left as-is.</li>
                  <li><strong style={{ color: ACCENT }}>Build vocabulary</strong> — count global word frequency across all documents. Take the top 500 most frequent words as the working vocabulary.</li>
                  <li><strong style={{ color: ACCENT }}>Min document frequency filter</strong> — any word appearing in fewer than <em>minDocFreq</em> documents is removed from vocabulary. Default = 2 (removes words unique to a single row — likely noise or proper nouns).</li>
                  <li><strong style={{ color: ACCENT }}>Collapsed Gibbs Sampling</strong> — each token is iteratively reassigned to a topic proportional to: <em>P(topic k | word w, doc d) ∝ (docTopic[d][k] + α) × (wordTopic[w][k] + β) / (topicTotal[k] + V·β)</em>. α = 0.1, β = 0.01. Runs for the configured iterations. Deterministic (seed = 42).</li>
                  <li><strong style={{ color: ACCENT }}>Output</strong> — topic-document distribution θ[d][k] exported as one column per topic (<em>lda_topic_0, lda_topic_1,…</em>). Top words per topic shown as coloured chips (φ distribution).</li>
                </ol>
              </div>
            )}
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
          </div>

          {/* Text preprocessing controls */}

          {/* Custom stopwords */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text3)", marginBottom: "0.3rem", fontWeight: 600 }}>
              Custom stopwords
            </div>
            <input
              type="text"
              placeholder="e.g. company, product, year"
              value={ldaOpts.stopwords}
              onChange={e => setLdaOpts(o => ({ ...o, stopwords: e.target.value }))}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, padding: "0.4rem 0.6rem",
                fontSize: "0.74rem", color: "var(--text)", outline: "none",
              }}
            />
            <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.2rem" }}>
              Comma-separated. Added on top of built-in stopwords.
            </div>
          </div>

          {/* Min doc frequency slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.74rem", color: "var(--text3)", flexShrink: 0, width: 120 }}>Min doc freq</span>
            <input
              type="range" min="1" max="10" step="1"
              value={ldaOpts.minDocFreq}
              onChange={e => setLdaOpts(o => ({ ...o, minDocFreq: parseInt(e.target.value) }))}
              style={{ flex: 1, accentColor: "#fb923c" }}
            />
            <span style={{ fontSize: "0.80rem", fontWeight: 700, color: "#fb923c", width: 24, textAlign: "right" }}>
              {ldaOpts.minDocFreq}
            </span>
          </div>

          {/* Stemming toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ldaOpts.stemming}
              onChange={e => setLdaOpts(o => ({ ...o, stemming: e.target.checked }))}
            />
            <span style={{ fontSize: "0.80rem", color: "var(--text2)" }}>
              Stemming <span style={{ fontSize: "0.70rem", color: "var(--text3)" }}>(strip common suffixes)</span>
            </span>
          </label>

          {/* Run button */}
          <div style={{ marginBottom: "0.9rem" }}>
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