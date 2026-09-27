"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import ToolBackNav from "@/components/ToolBackNav";
import PeriodicityRunner from "./PeriodicityRunner";
import PeriodicityUserGuideModal from "./PeriodicityUserGuideModal";
import { PERIODICITY_GUIDE, PERIODICITY_SUGGESTIONS } from "./userGuide";

const ACCENT = "#0ea5e9";

const TOOL_SUMMARY =
  "Paste a numeric series (one value per line) or a list of event timestamps, and it finds the strongest " +
  "repeating cycle using a Fast Fourier Transform — the 'every 7 days', 'every 24 hours', 'every 12 steps' " +
  "pattern hidden in the data. Numeric series report cycle length in samples; timestamps report real time " +
  "units. Fully client-side, zero backend, zero ML model.";

export default function PeriodicityFinderPage() {
  useToolTracking("periodicity-finder");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Periodicity Finder",
        summary: TOOL_SUMMARY,
        guide: PERIODICITY_GUIDE,
        suggestions: PERIODICITY_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-32">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"periodicity-finder"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Periodicity Finder</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Finds the dominant repeating cycle in a series or event log via FFT — real technique, no ML model
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

          <PeriodicityUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PeriodicityRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
