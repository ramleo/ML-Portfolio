"use client";

import { useRef, useCallback, useState } from "react";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          className="subtle-card"
          data-wt="cin-upload"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--border2)",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
            cursor: "pointer",
            background: "var(--bg-glass)",
            color: "var(--text3)",
            fontSize: "0.85rem",
            ["--acc-glow" as string]: "#38bdf814",
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
      data-wt="cin-meta"
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
          background: "var(--bg-card)",
          border: "1px solid var(--border2)",
          borderRadius: 999,
          padding: "0.3rem 0.85rem",
          color: "var(--text2)",
          fontSize: "0.8rem",
          fontWeight: 500,
        }}
      >
        {csvName}
      </span>

      {/* Target selector — custom dropdown so it opens downward and stays in viewport */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text3)" }}>
        Target:
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border2)",
              borderRadius: 6,
              color: "var(--text)",
              padding: "0.25rem 0.6rem",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              minWidth: 100,
              maxWidth: 160,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{target || "—"}</span>
            <span style={{ opacity: 0.5, fontSize: "0.7rem", flexShrink: 0 }}>▾</span>
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 50,
                background: "var(--bg-card)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                minWidth: 160,
                maxHeight: 220,
                overflowY: "auto",
                boxShadow: "var(--shadow)",
              }}
            >
              {columns.map((col) => (
                <button
                  key={col}
                  onClick={() => { onTarget(col); setDropdownOpen(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.4rem 0.75rem",
                    background: col === target ? "var(--border2)" : "transparent",
                    color: col === target ? "#38bdf8" : "var(--text2)",
                    fontSize: "0.8rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task type toggle */}
      {(["classification", "regression"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onTaskType(t)}
          style={{
            padding: "0.3rem 0.85rem",
            borderRadius: 999,
            border: `1.5px solid ${taskType === t ? "#7c3aed" : "var(--border2)"}`,
            background: taskType === t ? "#7c3aed22" : "transparent",
            color: taskType === t ? "#a78bfa" : "var(--text3)",
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
          border: "1px solid var(--border2)",
          background: "transparent",
          color: "var(--text3)",
          fontSize: "0.78rem",
          cursor: "pointer",
        }}
      >
        × Clear
      </button>
    </div>
  );
}