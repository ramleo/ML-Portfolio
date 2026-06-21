"use client";

import { useRef } from "react";
import { ACCENT } from "@/lib/automlUtils";

interface Props {
  analyzing: boolean;
  dragging:  boolean;
  error:     string;
  onFile:    (f: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop:    (e: React.DragEvent) => void;
}

export default function Step1Upload({
  analyzing, dragging, error, onFile, onDragOver, onDragLeave, onDrop,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p style={{ fontSize: "0.88rem", color: "var(--text2)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
        Upload any labeled CSV. AutoML will run RF, XGBoost, LightGBM, and CatBoost via 5-fold CV and pick the winner.
      </p>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? ACCENT : "var(--border2)"}`,
          borderRadius: 14, padding: "2.5rem 1.5rem", textAlign: "center" as const,
          cursor: "pointer", background: dragging ? `${ACCENT}08` : "transparent",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ margin: "0 auto 0.75rem" }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, marginBottom: "0.3rem" }}>
          {analyzing ? "Analyzing..." : "Drop CSV here or click to browse"}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Any labeled CSV with a target column</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>
      {error && <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#f87171" }}>{error}</p>}
      <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.5rem", textAlign: "center" }}>
        All rows processed · iteration count auto-scales with dataset size
      </div>
    </div>
  );
}
