"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExtractedField, FieldValidation } from "./_types";

const ACCENT = "#387e8a";
const RING_SIZE = 28;
const RING_R = 11;
const RING_CIRC = 2 * Math.PI * RING_R;

interface Props {
  fields: ExtractedField[];
  activeField: string | null;
  onFieldHover: (name: string | null) => void;
  docTypeLabel: string | null;
  provider?: string | null;
  onFieldEdit?: (name: string, value: string) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq", mistral: "Mistral", gemini: "Gemini",
  cohere: "Cohere", cerebras: "Cerebras",
};

function providerLabel(p: string): string {
  const [base, ...rest] = p.split(" ");
  const name = PROVIDER_LABELS[base] ?? base;
  return rest.length ? `${name} ${rest.join(" ")}` : name;
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(1, confidence));
  const fill = RING_CIRC * pct;
  const color = pct >= 0.9 ? "#10b981" : pct >= 0.7 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={RING_SIZE} height={RING_SIZE} className="shrink-0">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
        fill="none" stroke="var(--border)" strokeWidth={2.5} />
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
        fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={`${fill} ${RING_CIRC - fill}`}
        strokeLinecap="round"
        strokeDashoffset={RING_CIRC * 0.25}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x={RING_SIZE / 2} y={RING_SIZE / 2 + 2.5}
        textAnchor="middle" fontSize={6.5} fill={color} fontWeight="bold">
        {Math.round(pct * 100)}%
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
      style={{ color: copied ? "#10b981" : "var(--text3)" }} title="Copy value">
      {copied
        ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V3" stroke="currentColor" strokeWidth="1.3"/></svg>
      }
    </button>
  );
}

function ValidationBadge({ v }: { v: FieldValidation }) {
  if (v.status === "ok") return null;
  const cfg = v.status === "corrected"
    ? { color: "#818cf8", bg: "rgba(99,102,241,0.12)", icon: "M12 2l-1.5 9H6l6 4-2.5 7L16 16h4l-5.5-4L16 2z", label: "Corrected" }
    : v.status === "flagged"
    ? { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01", label: "Flagged" }
    : { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 8v4M12 16h.01", label: "Low confidence" };
  return (
    <span title={v.note}
      className="flex items-center gap-0.5 text-[7px] px-1 py-px rounded cursor-help shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
        <path d={cfg.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {cfg.label}
    </span>
  );
}

function ExportDropdown({ fields, docTypeLabel }: { fields: ExtractedField[]; docTypeLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportJSON = () => {
    const data = {
      document_type: docTypeLabel ?? "unknown",
      exported_at: new Date().toISOString(),
      field_count: fields.length,
      fields: fields.map(f => ({
        name: f.name,
        label: f.label,
        value: f.value,
        confidence: Math.round(f.confidence * 100) / 100,
        ...(f.originalValue !== undefined && f.originalValue !== f.value
          ? { original_value: f.originalValue, human_edited: true } : {}),
      })),
    };
    download(JSON.stringify(data, null, 2), "extracted_fields.json", "application/json");
  };

  const exportCSV = () => {
    const header = ["Field Name", "Label", "Value", "Confidence %"];
    const rows = fields.map(f => [
      f.name,
      f.label,
      `"${f.value.replace(/"/g, '""')}"`,
      Math.round(f.confidence * 100).toString(),
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    download(csv, "extracted_fields.csv", "text/csv");
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "4px", minWidth: 130,
    boxShadow: "var(--shadow)",
  };

  const itemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 10px", borderRadius: 6, cursor: "pointer",
    fontSize: 11, color: "var(--text2)", width: "100%", border: "none",
    background: "transparent", textAlign: "left",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-md border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
        style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
        Export
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={menuStyle}>
          <button style={itemStyle} onClick={exportJSON}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            JSON
          </button>
          <button style={itemStyle} onClick={exportCSV}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2 6h12M2 10h12M6 2v12" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocFieldsPanel({ fields, activeField, onFieldHover, docTypeLabel, provider, onFieldEdit }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(14px)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={cardStyle} className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}>
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
          {provider && (
            <span className="ml-1.5 text-[8px] px-1.5 py-px rounded"
              title="AI provider that served this extraction"
              style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8",
                       border: "1px solid rgba(129,140,248,0.2)" }}>
              via {providerLabel(provider)}
            </span>
          )}
        </div>
        {fields.length > 0 && <ExportDropdown fields={fields} docTypeLabel={docTypeLabel} />}
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
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>
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
                    background: isActive ? "rgba(6,182,212,0.07)" : "var(--bg-glass)",
                    border: `1px solid ${isActive ? "rgba(6,182,212,0.25)" : "var(--border)"}`,
                  }}
                  onMouseEnter={() => onFieldHover(field.name)}
                  onMouseLeave={() => onFieldHover(null)}
                >
                  <ConfidenceRing confidence={field.confidence} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wide"
                        style={{ color: "var(--text3)" }}>
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
                      {field.validation && <ValidationBadge v={field.validation} />}
                    </div>
                    {editing === field.name ? (
                      <div className="flex flex-col gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                        <textarea
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          rows={Math.min(5, Math.max(2, Math.ceil(draft.length / 60)))}
                          autoFocus
                          className="w-full bg-transparent text-[11px] px-2 py-1.5 rounded-lg border outline-none resize-y"
                          style={{ borderColor: "rgba(6,182,212,0.4)", color: "var(--text)" }}
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { onFieldEdit?.(field.name, draft); setEditing(null); }}
                            className="text-[9px] px-2 py-1 rounded-md font-medium"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981",
                                     border: "1px solid rgba(16,185,129,0.3)" }}>
                            Save
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-[9px] px-2 py-1 rounded-md"
                            style={{ color: "var(--text3)",
                                     border: "1px solid var(--border2)" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] font-medium truncate" style={{ color: "var(--text)" }}>
                          {field.value}
                        </p>
                        {field.originalValue !== undefined && field.originalValue !== field.value && (
                          <p className="text-[9px] truncate mt-0.5" title={`AI extracted: ${field.originalValue}`}
                            style={{ color: "rgba(248,113,113,0.55)", textDecoration: "line-through" }}>
                            AI: {field.originalValue}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {onFieldEdit && editing !== field.name && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditing(field.name); setDraft(field.value); }}
                      className="shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--text3)" }} title="Edit value">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  <CopyBtn value={field.value} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {fields.length > 0 && (
        <div className="px-4 py-2 border-t shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
            {fields.length} field{fields.length !== 1 ? "s" : ""} extracted
            {" · "}{fields.filter(f => f.confidence >= 0.9).length} high confidence
            {(() => {
              const flagged = fields.filter(f => f.validation && f.validation.status !== "ok").length;
              return flagged > 0 ? <span style={{ color: "#f59e0b" }}>{" · "}{flagged} need review</span> : null;
            })()}
          </p>
        </div>
      )}
    </div>
  );
}