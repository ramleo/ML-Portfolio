"use client";

import { useState, useRef } from "react";
import { ACCENT } from "@/lib/preprocessingModalUtils";

interface UploadStepProps {
  analyzing: boolean;
  error: string | null;
  onFile: (f: File) => void;
}

export default function UploadStep({ analyzing, error, onFile }: UploadStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? ACCENT : "var(--border2)"}`,
          borderRadius: 14, padding: "3rem 2rem",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
          cursor: "pointer", transition: "border-color 0.2s",
          background: dragging ? `${ACCENT}08` : "transparent",
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>Drop your CSV here</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>or click to browse</div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {analyzing && (
        <div style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--text3)", fontSize: "0.82rem" }}>
          Analyzing dataset...
        </div>
      )}
      {error && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: 10,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
