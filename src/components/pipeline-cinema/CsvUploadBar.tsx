"use client";

import { useRef, useCallback } from "react";

interface Props {
  csvB64: string | null;
  csvName: string;
  columns: string[];
  target: string;
  taskType: "classification" | "regression";
  onFile: (file: File) => void;
  onTarget: (t: string) => void;
  onTaskType: (t: "classification" | "regression") => void;
  onClear: () => void;
}

export default function CsvUploadBar({
  csvB64, csvName, columns, target, taskType,
  onFile, onTarget, onTaskType, onClear,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  if (!csvB64) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto 1.25rem" }}>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #1e3a5f",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
            cursor: "pointer",
            background: "#070f1e",
            color: "#64748b",
            fontSize: "0.85rem",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
          Drop a CSV here or click to upload — pipeline runs on your real data
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      {/* Filename badge */}
      <span
        style={{
          background: "#0f1e35",
          border: "1px solid #1e3a5f",
          borderRadius: 999,
          padding: "0.3rem 0.85rem",
          color: "#94a3b8",
          fontSize: "0.8rem",
          fontWeight: 500,
        }}
      >
        {csvName}
      </span>

      {/* Target selector */}
      <label
        style={{
          color: "#64748b",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        Target:
        <select
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          style={{
            background: "#0f1e35",
            border: "1px solid #1e3a5f",
            borderRadius: 6,
            color: "#f0f4f8",
            padding: "0.25rem 0.5rem",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </label>

      {/* Task type toggle */}
      {(["classification", "regression"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onTaskType(t)}
          style={{
            padding: "0.3rem 0.85rem",
            borderRadius: 999,
            border: `1.5px solid ${taskType === t ? "#7c3aed" : "#1e3a5f"}`,
            background: taskType === t ? "#7c3aed22" : "transparent",
            color: taskType === t ? "#a78bfa" : "#475569",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}

      {/* Clear */}
      <button
        onClick={onClear}
        style={{
          padding: "0.3rem 0.7rem",
          borderRadius: 999,
          border: "1px solid #1e3a5f",
          background: "transparent",
          color: "#64748b",
          fontSize: "0.78rem",
          cursor: "pointer",
        }}
      >
        × Clear
      </button>
    </div>
  );
}