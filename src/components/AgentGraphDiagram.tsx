"use client";

import { useState } from "react";

type NodeStatus = "idle" | "active" | "done" | "skipped";

interface GraphNode {
  id:    string;
  label: string;
  desc:  string;
}

const NODES: GraphNode[] = [
  { id: "routing",    label: "Query Router",      desc: "Classifies query complexity" },
  { id: "retrieving", label: "Retriever",          desc: "Hybrid BM25 + dense search" },
  { id: "grading",    label: "Relevance Grader",   desc: "Grades chunk quality" },
  { id: "rewriting",  label: "Query Rewriter",     desc: "Refines query if needed (≤2×)" },
  { id: "generating", label: "Generator",          desc: "Streams LLM response" },
];

interface Props {
  activeStep:     string | null;
  completedSteps: string[];
  loops:          number;
  accent:         string;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1.5,5 4,7.5 8.5,2.5" />
    </svg>
  );
}

function NodeDot({ status, accent }: { status: NodeStatus; accent: string }) {
  const isActive = status === "active";
  const isDone   = status === "done";

  return (
    <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
      {/* Pulse ring — only when active */}
      {isActive && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: `2px solid ${accent}`,
          animation: "agentPulse 1.1s ease-out infinite",
          opacity: 0.6,
        }} />
      )}
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isActive ? accent
          : isDone   ? `${accent}28`
          : "rgba(255,255,255,0.06)",
        border: `1.5px solid ${
          isActive ? accent
          : isDone  ? `${accent}66`
          : "rgba(255,255,255,0.15)"
        }`,
        transition: "all 0.3s ease",
      }}>
        {isDone  && <CheckIcon color={accent} />}
        {isActive && (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#000" }} />
        )}
        {status === "idle" && (
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
        )}
      </div>
    </div>
  );
}

function LoopArrow({ accent, loops }: { accent: string; loops: number }) {
  if (loops === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.3rem",
      marginLeft: 10, paddingLeft: 8,
      borderLeft: `1.5px dashed ${accent}55`,
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
        stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6 C2 3 5 1 8 3 L10 4" />
        <polyline points="8,1 10,4 7,5" />
      </svg>
      <span style={{ fontSize: "0.56rem", color: accent, fontWeight: 600 }}>
        loop {loops}×
      </span>
    </div>
  );
}

export default function AgentGraphDiagram({ activeStep, completedSteps, loops, accent }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  function statusOf(nodeId: string): NodeStatus {
    if (activeStep === nodeId)           return "active";
    if (completedSteps.includes(nodeId)) return "done";
    return "idle";
  }

  const isRewriteNode = (id: string) => id === "rewriting";

  return (
    <div style={{
      padding: "0.65rem 0.85rem",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, margin: "0.5rem 0 0",
    }}>
      {/* Inline keyframes */}
      <style>{`
        @keyframes agentPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>

      {/* Header with collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: isOpen ? "0.5rem" : 0 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
          Agent Graph
        </div>
        <button onClick={() => setIsOpen(o => !o)}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px 3px", color: "var(--text3)", display: "flex", alignItems: "center" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {NODES.map((node, idx) => {
              const status = statusOf(node.id);
              const isLast = idx === NODES.length - 1;

              return (
                <div key={node.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    <NodeDot status={status} accent={accent} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: "0.68rem", fontWeight: 600,
                        color: status === "active" ? accent
                             : status === "done"   ? "var(--text2)"
                             : "var(--text3)",
                        transition: "color 0.3s",
                      }}>
                        {node.label}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "var(--text3)", lineHeight: 1.3 }}>
                        {node.desc}
                      </div>
                    </div>
                    {isRewriteNode(node.id) && <LoopArrow accent={accent} loops={loops} />}
                  </div>

                  {!isLast && (
                    <div style={{
                      marginLeft: 9, width: 2, height: 14,
                      background: isRewriteNode(node.id) && loops > 0
                        ? `linear-gradient(to bottom, ${accent}44, ${accent}22)`
                        : "rgba(255,255,255,0.08)",
                      borderRadius: 1,
                      transition: "background 0.3s",
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {!activeStep && completedSteps.length === 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.58rem", color: "var(--text3)", lineHeight: 1.4 }}>
              Nodes highlight live as your query flows through the graph.
            </div>
          )}
        </div>
      )}
    </div>
  );
}