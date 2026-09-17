"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import MovementComparisonRunner from "./MovementComparisonRunner";
import MovementComparisonUserGuideModal from "./MovementComparisonUserGuideModal";
import { MOVEMENT_COMPARISON_GUIDE, MOVEMENT_COMPARISON_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#3f8358";

const TOOL_SUMMARY =
  "Upload your movement video and a reference video of the same exercise — tracks body pose with MediaPipe, " +
  "computes 6 real joint angles (elbows, knees, hips), and compares them on a shared 0-100% movement-phase axis " +
  "so clips of different length/speed are directly comparable. A training-form aid, not a clinical assessment. " +
  "Runs entirely in the browser; no video is uploaded anywhere.";

export default function MovementFormComparisonPage() {
  useToolTracking("movement-form-comparison");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Movement Form Comparison",
        summary: TOOL_SUMMARY,
        guide: MOVEMENT_COMPARISON_GUIDE,
        suggestions: MOVEMENT_COMPARISON_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"movement-form-comparison"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6.5 6.5l3 3M14.5 14.5l3 3M4 20l3.5-3.5M17 7l3-3M9.5 9.5l5 5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="6" cy="6" r="2" stroke={ACCENT} strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="2" stroke={ACCENT} strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Movement Form Comparison</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Compares your workout video to a reference using real, measured joint angles
              </p>
            </div>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
            <ThemeToggle />
          </div>

          <MovementComparisonUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <MovementComparisonRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
