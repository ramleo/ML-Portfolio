"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import RagSourceCard from "./RagSourceCard";
import GroundednessBadge, { type Groundedness } from "./GroundednessBadge";

type Message  = { role: "user" | "assistant"; content: string };
type RagSource = { source: string; text: string; score: number; display_score: number };

interface Props {
  messages:          Message[];
  loading:           boolean;
  loadingLabel:      string;
  sources:           RagSource[];
  sourcesOpen:       boolean;
  accentColor:       string;
  bottomRef:         React.RefObject<HTMLDivElement | null>;
  cacheHit?:         boolean;
  latencyMs?:        number | null;
  expandedQueries?:  string[];
  candidatesRetrieved?: number | null;
  answerSource?:     string | null;
  confidence?:       string | null;
  groundedness?:     Groundedness | null;
  onSuggestion:      (q: string) => void;
  onSourcesToggle:   () => void;
  suggestions?:      string[];
  emptyHint?:        string;
}

const MD_COMPONENTS = {
  p:      ({ children }: React.PropsWithChildren) => <p style={{ margin: "0 0 0.4em" }}>{children}</p>,
  h1:     ({ children }: React.PropsWithChildren) => <p style={{ margin: "0.5em 0 0.3em", fontWeight: 700, fontSize: "0.85em" }}>{children}</p>,
  h2:     ({ children }: React.PropsWithChildren) => <p style={{ margin: "0.5em 0 0.3em", fontWeight: 700, fontSize: "0.82em" }}>{children}</p>,
  h3:     ({ children }: React.PropsWithChildren) => <p style={{ margin: "0.4em 0 0.2em", fontWeight: 600, fontSize: "0.79em" }}>{children}</p>,
  ul:     ({ children }: React.PropsWithChildren) => <ul style={{ margin: "0.2em 0", paddingLeft: "1.2em" }}>{children}</ul>,
  ol:     ({ children }: React.PropsWithChildren) => <ol style={{ margin: "0.2em 0", paddingLeft: "1.2em" }}>{children}</ol>,
  li:     ({ children }: React.PropsWithChildren) => <li style={{ marginBottom: "0.15em" }}>{children}</li>,
  code:   ({ children }: React.PropsWithChildren) => <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 3, padding: "0 3px", fontSize: "0.9em", fontFamily: "monospace" }}>{children}</code>,
  pre:    ({ children }: React.PropsWithChildren) => <pre style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "0.5em 0.75em", overflowX: "auto", margin: "0.4em 0", fontSize: "0.88em" }}>{children}</pre>,
  strong: ({ children }: React.PropsWithChildren) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
  hr:     () => <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.5em 0" }} />,
};

const SUGGESTIONS = [
  "Which columns need normalisation?",
  "What does log1p do to skewed data?",
  "When should I use frequency encoding?",
];

const SOURCE_LABELS: Record<string, string> = {
  dataset: "Dataset", uploaded_doc: "Your Doc",
  knowledge_base: "Knowledge Base", web: "Web", none: "Dataset",
};
const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#34d399", medium: "#f59e0b", low: "#f87171",
};

export default function ChatMessageList({
  messages, loading, loadingLabel, sources, sourcesOpen,
  accentColor, bottomRef, cacheHit, latencyMs,
  expandedQueries = [], candidatesRetrieved,
  answerSource, confidence, groundedness,
  onSuggestion, onSourcesToggle,
  suggestions, emptyHint,
}: Props) {
  const [insightsOpen, setInsightsOpen] = useState(false);

  const hasInsights = expandedQueries.length > 0 || candidatesRetrieved != null || !!groundedness;

  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>

      {messages.length === 0 && (
        <div style={{ margin: "auto", textAlign: "center", color: "var(--text3)", fontSize: "0.72rem", lineHeight: 1.7, padding: "1rem" }}>
          {emptyHint ?? "Ask anything about your data, transforms, or ML concepts."}
          <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {(suggestions ?? SUGGESTIONS).map(q => (
              <button key={q} onClick={() => onSuggestion(q)}
                style={{ background: `${accentColor}0f`, border: `1px solid ${accentColor}28`, borderRadius: 8, color: accentColor, fontSize: "0.65rem", padding: "0.3rem 0.6rem", cursor: "pointer", textAlign: "left" }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((m, i) => (
        <div key={i} style={{
          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
          maxWidth: "88%", padding: "0.5rem 0.75rem",
          borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
          background: m.role === "user" ? `${accentColor}22` : "rgba(255,255,255,0.05)",
          border: `1px solid ${m.role === "user" ? accentColor + "44" : "rgba(255,255,255,0.08)"}`,
          fontSize: "0.73rem", lineHeight: 1.65, color: m.role === "user" ? "var(--text)" : "var(--text2)",
        }}>
          {m.role === "assistant"
            ? <ReactMarkdown components={MD_COMPONENTS}>{m.content}</ReactMarkdown>
            : <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>}
        </div>
      ))}

      {/* Confidence + source badge — shown after last assistant message */}
      {messages.length > 0 && messages[messages.length - 1].role === "assistant" && !loading && confidence && (
        <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "-0.2rem" }}>
          {answerSource && SOURCE_LABELS[answerSource] && (
            <span style={{ fontSize: "0.54rem", color: "var(--text3)", fontWeight: 500 }}>
              {SOURCE_LABELS[answerSource]}
            </span>
          )}
          {answerSource && SOURCE_LABELS[answerSource] && <span style={{ fontSize: "0.5rem", color: "var(--text3)" }}>·</span>}
          <span style={{
            fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
            color: CONFIDENCE_COLORS[confidence] ?? "var(--text3)",
            background: `${CONFIDENCE_COLORS[confidence] ?? "#888"}18`,
            borderRadius: 9999, padding: "1px 6px",
          }}>
            {confidence} confidence
          </span>
        </div>
      )}

      {sources.length > 0 && !loading && answerSource !== "dataset" && (
        <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {/* Sources toggle row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <button onClick={onSourcesToggle}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
              <span style={{ transform: sourcesOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>›</span>
              Sources ({sources.length})
            </button>
            {cacheHit && (
              <span title="Response served from semantic cache"
                style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.05em", color: "#34d399", background: "#34d39918", borderRadius: 9999, padding: "1px 6px", textTransform: "uppercase" }}>
                Cached
              </span>
            )}
            {latencyMs != null && (
              <span style={{ fontSize: "0.55rem", color: "var(--text3)" }}>
                {latencyMs < 1000 ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>

          {sourcesOpen && sources.map((s, i) => (
            <RagSourceCard key={i} source={s.source} text={s.text} score={s.display_score ?? s.score} rawScore={s.score} accent={accentColor} />
          ))}

          {/* How I searched — collapsible retrieval insights */}
          {hasInsights && (
            <div style={{ marginTop: "0.1rem" }}>
              <button onClick={() => setInsightsOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                <span style={{ transform: insightsOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>›</span>
                How I searched
              </button>

              {insightsOpen && (
                <div style={{
                  marginTop: "0.35rem", padding: "0.5rem 0.65rem",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, display: "flex", flexDirection: "column", gap: "0.4rem",
                }}>
                  <GroundednessBadge groundedness={groundedness} />
                  {candidatesRetrieved != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.57rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Retrieval</span>
                      <span style={{ fontSize: "0.6rem", color: accentColor, background: `${accentColor}14`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>{candidatesRetrieved} candidates</span>
                      <span style={{ fontSize: "0.57rem", color: "var(--text3)" }}>→ reranked to</span>
                      <span style={{ fontSize: "0.6rem", color: accentColor, background: `${accentColor}14`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>{sources.length} chunks</span>
                    </div>
                  )}
                  {expandedQueries.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{ fontSize: "0.57rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Query variants searched</span>
                      {expandedQueries.map((q, i) => (
                        <div key={i} style={{ fontSize: "0.62rem", color: "var(--text2)", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: 5, borderLeft: `2px solid ${accentColor}55`, lineHeight: 1.4 }}>
                          {q}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ alignSelf: "flex-start", padding: "0.5rem 0.75rem", borderRadius: "12px 12px 12px 3px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.73rem", color: "var(--text3)" }}>
          <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>{loadingLabel}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}