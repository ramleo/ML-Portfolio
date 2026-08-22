"use client";

import type { DocTypeInfo } from "./_types";

const ACCENT = "#06b6d4";
const FORMATS = ["PDF", "DOCX", "PNG", "JPG", "JPEG", "WEBP"];

interface Props {
  docTypes: DocTypeInfo[];
  selectedType: string;
  onSelect: (id: string) => void;
  detectedType: string | null;
  detectedConfidence: number;
  disabled: boolean;
}

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1rem",
};

export default function DocSidebar({
  docTypes, selectedType, onSelect, detectedType, detectedConfidence, disabled,
}: Props) {
  return (
    <aside className="w-52 shrink-0 flex flex-col gap-3">

      {/* Document Type Selector */}
      <div style={CARD}>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-3"
          style={{ color: `${ACCENT}99` }}>
          Document Type
        </p>
        <div className="flex flex-col gap-1">
          <TypeOption
            id="auto" label="Auto-detect" description="Let AI classify"
            selected={selectedType === "auto"} onSelect={onSelect} disabled={disabled}
            accent={ACCENT}
          />
          {docTypes.map(dt => (
            <TypeOption
              key={dt.id} id={dt.id} label={dt.label} description={dt.description}
              selected={selectedType === dt.id} onSelect={onSelect} disabled={disabled}
              accent={ACCENT}
              detected={detectedType === dt.id}
              detectedConfidence={detectedType === dt.id ? detectedConfidence : undefined}
            />
          ))}
        </div>
      </div>

      {/* Supported formats */}
      <div style={CARD}>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2"
          style={{ color: `${ACCENT}99` }}>
          Supported Formats
        </p>
        <div className="flex flex-wrap gap-1">
          {FORMATS.map(f => (
            <span key={f} className="text-[9px] px-1.5 py-[2px] rounded"
              style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.15)" }}>
              {f}
            </span>
          ))}
        </div>
        <p className="text-[9px] mt-2" style={{ color: "var(--text3)" }}>
          Max 10 MB per file
        </p>
      </div>

      {/* Detection result */}
      {detectedType && (
        <div style={{ ...CARD, borderColor: `${ACCENT}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-1.5"
            style={{ color: `${ACCENT}99` }}>
            AI Detected
          </p>
          <p className="text-[11px] font-semibold" style={{ color: ACCENT }}>
            {docTypes.find(d => d.id === detectedType)?.label ?? detectedType}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-1 rounded-full transition-all"
                style={{ width: `${Math.round(detectedConfidence * 100)}%`, background: ACCENT }} />
            </div>
            <span className="text-[9px] tabular-nums" style={{ color: "var(--text3)" }}>
              {Math.round(detectedConfidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={CARD}>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2"
          style={{ color: `${ACCENT}99` }}>
          How It Works
        </p>
        {[
          "Upload a document (PDF or image)",
          "AI classifies type + extracts fields",
          "Bounding boxes highlight each field",
          "Copy or export structured data",
        ].map((step, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <span className="text-[9px] font-bold shrink-0 w-3.5 tabular-nums"
              style={{ color: `${ACCENT}70` }}>{i + 1}</span>
            <span className="text-[9px] leading-tight" style={{ color: "var(--text3)" }}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function TypeOption({ id, label, description, selected, onSelect, disabled, accent, detected, detectedConfidence }: {
  id: string; label: string; description: string; selected: boolean;
  onSelect: (id: string) => void; disabled: boolean; accent: string;
  detected?: boolean; detectedConfidence?: number;
}) {
  return (
    <button
      onClick={() => !disabled && onSelect(id)}
      disabled={disabled}
      className="w-full text-left px-2 py-1.5 rounded-lg transition-all"
      style={selected
        ? { background: `${accent}15`, border: `1px solid ${accent}40`, color: accent }
        : { background: "transparent", border: "1px solid transparent", color: "var(--text3)" }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-medium">{label}</span>
        {detected && (
          <span className="text-[7px] px-1 py-px rounded shrink-0"
            style={{ background: `${accent}20`, color: accent }}>
            AI
          </span>
        )}
      </div>
    </button>
  );
}