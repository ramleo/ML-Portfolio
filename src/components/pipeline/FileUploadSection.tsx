"use client";

import { useState } from "react";

interface Props {
  onFile: (b64: string, columns: string[]) => void;
}

export default function FileUploadSection({ onFile }: Props) {
  const [dragOver, setDragOver] = useState(false);

  function processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const b64 = raw.includes(",") ? raw.split(",")[1] : raw;
      // Parse column names from the base64-encoded CSV header
      try {
        const decoded = atob(b64);
        const firstLine = decoded.split("\n")[0] ?? "";
        const cols = firstLine.split(",").map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
        onFile(b64, cols);
      } catch {
        onFile(b64, []);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2.5rem 2rem",
        border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 14,
        background: dragOver ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.02)",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "center",
        marginBottom: "2rem",
      }}
    >
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(200,205,225,0.5)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span style={{ fontSize: "0.9rem", color: "var(--text2, rgba(200,205,225,0.8))" }}>
        Drop a CSV file here or click to upload
      </span>
      <span style={{ fontSize: "0.75rem", color: "rgba(180,185,210,0.5)" }}>Supports .csv files</span>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
        style={{ display: "none" }}
      />
    </label>
  );
}