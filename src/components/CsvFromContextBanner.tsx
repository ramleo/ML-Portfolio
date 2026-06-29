"use client";

import { useMemo } from "react";

interface Props {
  csvB64: string;                    // the base64 CSV that was auto-loaded
  stageLabel: string;               // e.g. "preprocessed data", "FE-transformed data"
  onUploadDifferent: () => void;    // callback when user wants to upload a fresh file
  accent?: string;
}

export default function CsvFromContextBanner({ csvB64, stageLabel, onUploadDifferent, accent = "#22c55e" }: Props) {
  const { rows, cols } = useMemo(() => {
    try {
      const text = atob(csvB64);
      const lines = text.split("\n").filter(Boolean);
      return { rows: lines.length - 1, cols: lines[0]?.split(",").length ?? 0 };
    } catch {
      return { rows: 0, cols: 0 };
    }
  }, [csvB64]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: `${accent}0f`, border: `1px solid ${accent}30`,
      borderRadius: 10, padding: "0.6rem 1rem", marginBottom: "0.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke={accent} strokeWidth="1.5" />
          <path d="M4 7l2 2 4-4" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: "0.78rem", color: accent, fontWeight: 600 }}>
          Using {stageLabel}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
          — {rows.toLocaleString()} rows × {cols} cols
        </span>
      </div>
      <button
        onClick={onUploadDifferent}
        style={{
          background: "none", border: `1px solid ${accent}40`, borderRadius: 6,
          color: accent, fontSize: "0.72rem", fontWeight: 600,
          padding: "0.2rem 0.6rem", cursor: "pointer",
        }}
      >
        Upload different file
      </button>
    </div>
  );
}