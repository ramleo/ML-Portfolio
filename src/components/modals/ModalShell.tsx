"use client";

import React from "react";

const SHELL_BG   = "var(--bg-card)";
const SHELL_ACCENT = "#818cf8";

interface ModalShellProps {
  onClose: () => void;
  title: string;
  eyebrow?: string;
  accent?: string;
  maxWidth?: number;
  children: React.ReactNode;
}

export default function ModalShell({
  onClose,
  title,
  eyebrow = "ML Capabilities",
  accent = SHELL_ACCENT,
  maxWidth = 660,
  children,
}: ModalShellProps) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "color-mix(in srgb, var(--bg) 85%, transparent)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div style={{
        width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto",
        background: SHELL_BG,
        border: `1px solid ${accent}24`,
        borderRadius: 20,
        boxShadow: `0 0 0 1px ${accent}12, 0 40px 100px rgba(0,0,0,0.85)`,
      }}>
        <div style={{ padding: "1.75rem 2rem 2rem" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: accent, display: "block", marginBottom: "0.2rem",
              }}>
                {eyebrow}
              </span>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text)" }}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9999,
                background: "var(--border)", border: "1px solid var(--border2)",
                color: "var(--text2)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--text3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}