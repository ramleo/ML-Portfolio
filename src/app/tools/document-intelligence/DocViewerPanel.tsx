"use client";

import type { ExtractedField } from "./_types";

const ACCENT = "#06b6d4";

const FIELD_TYPE_STROKE: Record<string, string> = {
  currency: "#10b981",
  date: "#06b6d4",
  text: "#818cf8",
};

interface Props {
  pageImages: string[];
  fields: ExtractedField[];
  activeField: string | null;
  onFieldClick: (name: string) => void;
  isScanning: boolean;
  processingMode: string | null;
}

export default function DocViewerPanel({
  pageImages, fields, activeField, onFieldClick, isScanning, processingMode,
}: Props) {
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
  };

  return (
    <div style={cardStyle} className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: `${ACCENT}99` }}>
          Document Preview
        </span>
        {processingMode && (
          <span className="text-[8px] px-2 py-[2px] rounded-full font-medium"
            style={["digital", "docx"].includes(processingMode)
              ? { background: "rgba(6,182,212,0.12)", color: ACCENT, border: "1px solid rgba(6,182,212,0.2)" }
              : { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            {processingMode === "digital" ? "Digital PDF"
              : processingMode === "docx" ? "Word — DOCX"
              : processingMode === "scanned" ? "Scanned — OCR" : "Image"}
          </span>
        )}
      </div>

      {/* Viewer */}
      <div className="relative flex-1 flex items-center justify-center p-3 min-h-[320px]"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        {pageImages.length === 0 ? (
          <div className="text-center">
            <svg className="mx-auto mb-2 opacity-20" width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {isScanning ? "Processing document…"
                : processingMode === "docx" ? "Word documents have no visual preview — fields are extracted from text"
                : "Document preview will appear here"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full overflow-y-auto" style={{ maxHeight: 600 }}>
            {pageImages.map((b64, idx) => (
              <div key={idx} className="relative" style={{ position: "relative" }}>
                {/* Page number badge */}
                <div className="absolute top-1 left-1 z-10 text-[8px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.5)" }}>
                  pg {idx + 1}
                </div>
                <img
                  src={`data:image/png;base64,${b64}`}
                  alt={`Page ${idx + 1}`}
                  className="rounded w-full object-contain"
                  style={{ display: "block", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                {/* Bounding box overlay — each field renders on its own page */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                  className="absolute inset-0"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  {fields.filter(f => f.bbox && (f.page ?? 1) === idx + 1).map(field => {
                    const [lx, ly, lw, lh] = field.bbox!;
                    const stroke = FIELD_TYPE_STROKE[field.field_type] ?? "#818cf8";
                    const isActive = activeField === field.name;
                    return (
                      <rect key={field.name}
                        x={lx * 100} y={ly * 100} width={lw * 100} height={lh * 100}
                        fill={isActive ? `${stroke}18` : "transparent"}
                        stroke={stroke} strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={isActive ? "none" : "4 3"} rx={0.3}
                        vectorEffect="non-scaling-stroke"
                        style={{ cursor: "pointer", transition: "all 0.2s", pointerEvents: "auto" }}
                        onClick={() => onFieldClick(field.name)} />
                    );
                  })}
                </svg>
              </div>
            ))}
            {/* Scanning animation over first page */}
            {isScanning && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                opacity: 0.8, animation: "scanLine 2s ease-in-out infinite",
              }} />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 0%; opacity: 0.8; }
          50%  { opacity: 1; }
          100% { top: calc(100% - 3px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}