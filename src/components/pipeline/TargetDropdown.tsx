"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

export default function TargetDropdown({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 7,
          color: "var(--text)",
          padding: "0.3rem 0.6rem",
          fontSize: "0.8rem",
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </span>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 200, marginTop: 4,
          background: "rgba(20,27,45,0.98)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8, maxHeight: 200, overflowY: "auto", minWidth: "100%",
        }}>
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: "0.35rem 0.75rem", fontSize: "0.8rem", cursor: "pointer",
                color: opt === value ? "#4ade80" : "var(--text)",
                background: "transparent", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "0.5rem", whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {opt}
              {opt === value && (
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}