"use client";

import { useState } from "react";

const NW = 178;  // node width
const NH = 38;   // node height
const NX = 20;   // node left edge
const STRIDE = 58; // px from one node top to next
const NCX = NX + NW / 2; // node center x = 109
const SVG_W = 240;
const SVG_H = 4 * STRIDE + NH + 10; // = 280

const NODES = [
  { id: "routing",    label: "Query Router",    desc: "Route: simple → skip grader" },
  { id: "retrieving", label: "Retriever",        desc: "Hybrid BM25 + dense search"  },
  { id: "grading",    label: "Relevance Grader", desc: "Grade: good / rewrite / web"  },
  { id: "rewriting",  label: "Query Rewriter",   desc: "Refine query if needed (≤2×)" },
  { id: "generating", label: "Generator",        desc: "Stream LLM response"          },
];

const NODE_Y = NODES.map((_, i) => 5 + i * STRIDE);

type NodeStatus = "idle" | "active" | "done";

interface Props {
  activeStep:     string | null;
  completedSteps: string[];
  loops:          number;
  accent:         string;
}

export default function AgentGraphDiagram({ activeStep, completedSteps, loops, accent }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  function statusOf(id: string): NodeStatus {
    if (activeStep === id)           return "active";
    if (completedSteps.includes(id)) return "done";
    return "idle";
  }

  function nodeStyle(status: NodeStatus) {
    if (status === "active") return { fill: `${accent}1a`, stroke: accent,        label: accent,          desc: `${accent}99` };
    if (status === "done")   return { fill: `${accent}0d`, stroke: `${accent}70`, label: "var(--text2)",  desc: "rgba(255,255,255,0.3)" };
    return                          { fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.12)", label: "var(--text3)", desc: "rgba(255,255,255,0.2)" };
  }

  const DIM_ARROW  = "rgba(255,255,255,0.18)";
  const loopAccent = loops > 0 ? accent : "rgba(255,255,255,0.15)";

  return (
    <div style={{
      padding: "0.55rem 0.75rem",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, margin: "0.5rem 0 0",
    }}>
      <style>{`
        @keyframes nodePulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
        @keyframes flowArrow { from { stroke-dashoffset: 14 } to { stroke-dashoffset: 0 } }
      `}</style>

      {/* Header + collapse */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: isOpen ? "0.35rem" : 0 }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
          Agent Graph
        </span>
        <button onClick={() => setIsOpen(o => !o)}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px 3px", color: "var(--text3)", display: "flex", alignItems: "center" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div>
          <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: "visible", display: "block" }}>

            {/* ── Down arrows ──────────────────────────────── */}
            {NODES.slice(0, -1).map((_, i) => {
              const y1 = NODE_Y[i] + NH;
              const y2 = NODE_Y[i + 1];
              const dst = statusOf(NODES[i + 1].id);
              const color = dst === "done" ? accent : dst === "active" ? `${accent}88` : DIM_ARROW;
              const anim = dst === "done" || dst === "active";
              return (
                <g key={i}>
                  <line x1={NCX} y1={y1} x2={NCX} y2={y2 - 5}
                    stroke={color} strokeWidth="1.5"
                    strokeDasharray={anim ? "5 3" : undefined}
                    style={anim ? { animation: "flowArrow 0.6s linear infinite" } : undefined} />
                  <polygon
                    points={`${NCX},${y2} ${NCX - 4},${y2 - 7} ${NCX + 4},${y2 - 7}`}
                    fill={color} />
                </g>
              );
            })}

            {/* ── Loop arrow: Rewriter (idx 3) → Retriever (idx 1) ── */}
            {(() => {
              const rx = NX + NW;          // right edge of nodes
              const fy = NODE_Y[3] + NH / 2; // rewriter center y
              const ty = NODE_Y[1] + NH / 2; // retriever center y
              const cx1 = rx + 38;
              return (
                <g>
                  <path
                    d={`M ${rx} ${fy} C ${cx1} ${fy} ${cx1} ${ty} ${rx} ${ty}`}
                    fill="none" stroke={loopAccent} strokeWidth="1.5" strokeDasharray="5 3" />
                  {/* Arrowhead pointing left into retriever */}
                  <polygon
                    points={`${rx},${ty} ${rx + 8},${ty - 4} ${rx + 8},${ty + 4}`}
                    fill={loopAccent} />
                  {loops > 0 && (
                    <text x={cx1 + 5} y={(fy + ty) / 2 + 4}
                      fontSize="9" fontWeight="700" fill={accent}
                      textAnchor="start">{loops}×</text>
                  )}
                </g>
              );
            })()}

            {/* ── Nodes ──────────────────────────────────── */}
            {NODES.map((node, i) => {
              const status = statusOf(node.id);
              const { fill, stroke, label, desc } = nodeStyle(status);
              const y = NODE_Y[i];
              const cy = y + NH / 2;

              return (
                <g key={node.id}>
                  {/* Pulse glow when active */}
                  {status === "active" && (
                    <rect x={NX - 3} y={y - 3} width={NW + 6} height={NH + 6} rx="9"
                      fill="none" stroke={accent} strokeWidth="1" opacity="0.5"
                      style={{ animation: "nodePulse 1.3s ease-in-out infinite" }} />
                  )}
                  {/* Node box */}
                  <rect x={NX} y={y} width={NW} height={NH} rx="6"
                    fill={fill} stroke={stroke} strokeWidth="1.5" />
                  {/* Label */}
                  <text x={NCX} y={y + 15} textAnchor="middle"
                    fontSize="11" fontWeight="600" fill={label}>
                    {node.label}
                  </text>
                  {/* Desc */}
                  <text x={NCX} y={y + 28} textAnchor="middle"
                    fontSize="8.5" fill={desc}>
                    {node.desc}
                  </text>
                  {/* Done checkmark */}
                  {status === "done" && (
                    <g transform={`translate(${NX + NW - 18}, ${cy})`}>
                      <circle r="6" fill={`${accent}22`} />
                      <polyline points="-3,0 -1,3 3,-3"
                        fill="none" stroke={accent} strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {!activeStep && completedSteps.length === 0 && (
            <div style={{ fontSize: "0.57rem", color: "var(--text3)", lineHeight: 1.4, marginTop: "0.25rem" }}>
              Nodes highlight live as your query flows through the graph.
            </div>
          )}
        </div>
      )}
    </div>
  );
}