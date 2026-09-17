"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PlantGrowthRunner from "./PlantGrowthRunner";
import PlantGrowthGroupMode from "./PlantGrowthGroupMode";
import PlantGrowthUserGuideModal from "./PlantGrowthUserGuideModal";
import { PLANT_GROWTH_GUIDE, PLANT_GROWTH_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#3f8258";

const TOOL_SUMMARY =
  "Upload 2-30 photos of the same plant taken on different days — a local HSV green-hue threshold " +
  "measures the leaf/foliage area in each photo (no ML model, no API cost), then plots a growth curve " +
  "as percentage change from the first photo. Each photo gets a mask-preview overlay showing exactly " +
  "what pixels were counted as plant, so you can verify the measurement instead of trusting a number " +
  "blindly. Works best with consistent framing/distance across the series — this measures relative " +
  "pixel area, not real-world size.";

export default function PlantGrowthPage() {
  useToolTracking("plant-growth");
  const [mode, setMode] = useState<"labeled" | "group">("labeled");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Plant Growth Quantification",
        summary: TOOL_SUMMARY,
        guide: PLANT_GROWTH_GUIDE,
        suggestions: PLANT_GROWTH_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"plant-growth"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 22V12M12 12c0-4 3-7 7-7 0 4-3 7-7 7ZM12 12C12 8 9 5 5 5c0 4 3 7 7 7Z" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Plant Growth Quantification</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Measures leaf area across a timelapse photo series to chart growth (or stress) over time
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

          <PlantGrowthUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <div className="flex items-center gap-2 mb-4">
            {([["labeled", "I know the plants/order"], ["group", "Unordered batch — figure it out"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setMode(key)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
                style={{
                  background: mode === key ? ACCENT : "transparent",
                  color: mode === key ? "#0b0b12" : "var(--text3)",
                  border: mode === key ? "none" : "1px solid var(--border)",
                }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "labeled" ? <PlantGrowthRunner accent={ACCENT} /> : <PlantGrowthGroupMode accent={ACCENT} />}
        </div>
      </div>
    </div>
  );
}
