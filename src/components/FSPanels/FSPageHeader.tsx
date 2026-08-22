"use client";

import { StepIndicator } from "@/components/StepIndicator";
import ThemeToggle from "@/components/ThemeToggle";

interface BadgeProps { label: string; color: string; }
function Badge({ label, color }: BadgeProps) {
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 600, color,
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 9999,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

const FS_STEP_LABELS = ["Upload", "Configure", "Results"];

interface Props {
  accent: string;
  onHome: () => void;
  currentStep: number;
}

export default function FSPageHeader({ accent, onHome, currentStep }: Props) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--bg-nav)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto", padding: "0 1.5rem",
        height: 60, display: "flex", alignItems: "center", gap: "1.5rem",
      }}>
        <button
          onClick={onHome}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12L4 7l5-5" />
          </svg>
          Home
        </button>
        <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Selection</span>
          <Badge label="runs in browser" color="#22c55e" />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <StepIndicator labels={FS_STEP_LABELS} currentIndex={currentStep - 1} accent={accent} />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
