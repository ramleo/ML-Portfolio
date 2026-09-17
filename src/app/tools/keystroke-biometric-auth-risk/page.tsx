"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import KeystrokeAuthRiskRunner from "./KeystrokeAuthRiskRunner";
import KeystrokeAuthRiskUserGuideModal from "./KeystrokeAuthRiskUserGuideModal";
import { KEYSTROKE_AUTH_GUIDE, KEYSTROKE_AUTH_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#3f8358";

const TOOL_SUMMARY =
  "Type a fixed phrase 3 times to enroll a real keystroke-timing profile (dwell + flight time per " +
  "key), then retype it once more to see a scaled-Manhattan-distance risk score against your own " +
  "enrolled rhythm — the real classifier published keystroke-dynamics biometric research uses. " +
  "Entirely client-side, zero ML model, zero server call.";

export default function KeystrokeAuthRiskPage() {
  useToolTracking("keystroke-biometric-auth-risk");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Keystroke Biometric Auth-Risk Demo",
        summary: TOOL_SUMMARY,
        guide: KEYSTROKE_AUTH_GUIDE,
        suggestions: KEYSTROKE_AUTH_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"keystroke-biometric-auth-risk"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a4 4 0 014 4v1a4 4 0 01-.5 1.94M8 8a4 4 0 018 0v1c0 1.5-.3 2.5-1 3.5M6 12c0 3 1 6 2 8M18 12c0-1-.1-2-.4-3M9 16.5c.5 1.5 1.5 3 3 4.5M14.5 16c.3 1 .7 2 1.5 3"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Keystroke Biometric Auth-Risk Demo</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Live Biometric Demo · Zero ML
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Enroll your typing rhythm, then see a real risk score for a later retype
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

          <KeystrokeAuthRiskUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <KeystrokeAuthRiskRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
