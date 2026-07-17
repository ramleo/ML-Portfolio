"use client";

import { useRef, useEffect, useState } from "react";
import type { ExtractedField } from "./_types";

const ACCENT = "#06b6d4";

const FIELD_TYPE_STROKE: Record<string, string> = {
  currency: "#10b981",
  date: "#06b6d4",
  text: "#818cf8",
};

interface Props {
  pageImage: string | null;
  fields: ExtractedField[];
  activeField: string | null;
  onFieldClick: (name: string) => void;
  isScanning: boolean;
  processingMode: string | null;
}

export default function DocViewerPanel({
  pageImage, fields, activeField, onFieldClick, isScanning, processingMode,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const update = () => setImgSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageImage]);

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
            style={processingMode === "digital"
              ? { background: "rgba(6,182,212,0.12)", color: ACCENT, border: "1px solid rgba(6,182,212,0.2)" }
              : { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            {processingMode === "digital" ? "Digital PDF" : processingMode === "scanned" ? "Scanned — OCR" : "Image"}
          </span>
        )}
      </div>

      {/* Viewer */}
      <div className="relative flex-1 flex items-center justify-center p-3 min-h-[320px]"
        style={{ background: "rgba(255,255,255,0.015)" }}>
        {!pageImage ? (
          <div className="text-center">
            <svg className="mx-auto mb-2 opacity-20" width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              {isScanning ? "Processing document…" : "Document preview will appear here"}
            </p>
          </div>
        ) : (
          <div className="relative" style={{ maxWidth: "100%", maxHeight: "480px" }}>
            <img
              ref={imgRef}
              src={`data:image/png;base64,${pageImage}`}
              alt="Document preview"
              className="rounded max-w-full max-h-[480px] object-contain"
              style={{ display: "block", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {/* Bounding box SVG overlay */}
            {imgSize.w > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={imgSize.w} height={imgSize.h}
                style={{ position: "absolute", top: 0, left: 0 }}
              >
                {fields.filter(f => f.bbox).map(field => {
                  const [lx, ly, lw, lh] = field.bbox!;
                  const x = lx * imgSize.w;
                  const y = ly * imgSize.h;
                  const w = lw * imgSize.w;
                  const h = lh * imgSize.h;
                  const stroke = FIELD_TYPE_STROKE[field.field_type] ?? "#818cf8";
                  const isActive = activeField === field.name;
                  return (
                    <rect
                      key={field.name}
                      x={x} y={y} width={w} height={h}
                      fill={isActive ? `${stroke}18` : "transparent"}
                      stroke={stroke}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={isActive ? "none" : "4 3"}
                      rx={2}
                      style={{ cursor: "pointer", transition: "all 0.2s" }}
                      onClick={() => onFieldClick(field.name)}
                    />
                  );
                })}
              </svg>
            )}

            {/* Scanning animation */}
            {isScanning && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                opacity: 0.8,
                animation: "scanLine 2s ease-in-out infinite",
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