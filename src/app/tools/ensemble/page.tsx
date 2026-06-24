"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import EnsembleRunner from "./EnsembleRunner";

const ACCENT = "#f472b6";

export default function EnsemblePage() {
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>Step 3</span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Ensemble Methods</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <EnsembleRunner />
      </div>

      <ToolsAIChat context={{
        tool: "Ensemble & Stacking",
        summary: "Ensemble learning visualiser covering soft voting, hard voting, and stacking with a meta-learner. Shows how combining diverse base models (XGBoost, Random Forest, LightGBM) reduces variance and improves AUC over any single model.",
      }} />
    </div>
  );
}
