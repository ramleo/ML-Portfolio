"use client";

import { StepIndicator } from "@/components/StepIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import ToolBackNav from "@/components/ToolBackNav";

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
        <ToolBackNav toolId="feature-selection" flush />
        <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>Feature Selection</h1>
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
