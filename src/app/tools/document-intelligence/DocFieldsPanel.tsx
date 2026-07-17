"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExtractedField } from "./_types";

const ACCENT = "#06b6d4";
const RING_SIZE = 28;
const RING_R = 11;
const RING_CIRC = 2 * Math.PI * RING_R;

interface Props {
  fields: ExtractedField[];
  activeField: string | null;
  onFieldHover: (name: string | null) => void;
  docTypeLabel: string | null;
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(1, confidence));
  const fill = RING_CIRC * pct;
  const color = pct >= 0.9 ? "#10b981" : pct >= 0.7 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={RING_SIZE} height={RING_SIZE} className="shrink-0">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={2.5} />
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
        fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={`${fill} ${RING_CIRC - fill}`}
        strokeLinecap="round"
        strokeDashoffset={RING_CIRC * 0.25}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x={RING_SIZE / 2} y={RING_SIZE / 2 + 3.5}
        textAnchor="middle" fontSize={7} fill={color} fontWeight="bold">
        {Math.round(pct * 100)}
      </text>
    </svg>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
      style={{ color: copied ? "#10b981" : "#4b5563" }} title="Copy value">
      {copied
        ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V3" stroke="currentColor" strokeWidth="1.3"/></svg>
      }
    </button>
  );
}

export default function DocFieldsPanel({ fields, activeField, onFieldHover, docTypeLabel }: Props) {
  const handleExport = () => {
    const obj = Object.fromEntries(fields.map(f => [f.name, f.value]));
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "extracted_fields.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={cardStyle} className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{ color: `${ACCENT}99` }}>
            Extracted Fields
          </span>
          {docTypeLabel && (
            <span className="ml-2 text-[8px] px-1.5 py-px rounded"
              style={{ background: "rgba(6,182,212,0.1)", color: ACCENT }}>
              {docTypeLabel}
            </span>
          )}
        </div>
        {fields.length > 0 && (
          <button onClick={handleExport}
            className="text-[9px] px-2 py-1 rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
            Export JSON
          </button>
        )}
      </div>

      {/* Fields list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {fields.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center py-8">
            <div>
              <svg className="mx-auto mb-2 opacity-20" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                  stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Fields will appear here as they are extracted
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {fields.map((field) => {
              const isActive = activeField === field.name;
              const conf = field.confidence;
              const confColor = conf >= 0.9 ? "#10b981" : conf >= 0.7 ? "#f59e0b" : "#ef4444";
              const confLabel = conf >= 0.9 ? "High" : conf >= 0.7 ? "Review" : "Low";
              return (
                <motion.div
                  key={field.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(6,182,212,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isActive ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  onMouseEnter={() => onFieldHover(field.name)}
                  onMouseLeave={() => onFieldHover(null)}
                >
                  <ConfidenceRing confidence={field.confidence} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wide"
                        style={{ color: "rgba(255,255,255,0.4)" }}>
                        {field.label}
                      </span>
                      <span className="text-[7px] px-1 py-px rounded shrink-0"
                        style={{ background: `${confColor}15`, color: confColor }}>
                        {confLabel}
                      </span>
                      {field.bbox && (
                        <span className="text-[7px] px-1 py-px rounded shrink-0"
                          style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9" }}>
                          Located
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {field.value}
                    </p>
                  </div>
                  <CopyBtn value={field.value} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {fields.length > 0 && (
        <div className="px-4 py-2 border-t shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            {fields.length} field{fields.length !== 1 ? "s" : ""} extracted
            {" · "}{fields.filter(f => f.confidence >= 0.9).length} high confidence
          </p>
        </div>
      )}
    </div>
  );
}