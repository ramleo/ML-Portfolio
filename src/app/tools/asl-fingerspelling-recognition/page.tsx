"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import AslFingerspellingRunner from "./AslFingerspellingRunner";
import AslFingerspellingUserGuideModal from "./AslFingerspellingUserGuideModal";
import { ASL_FINGERSPELLING_GUIDE, ASL_FINGERSPELLING_SUGGESTIONS } from "./userGuide";

const ACCENT = "#0891b2";

const TOOL_SUMMARY =
  "Hold up one hand fingerspelling an ASL letter and this recognizes it live from your webcam — " +
  "MediaPipe hand landmarks feed a k-NN classifier trained on real photos, entirely client-side, no " +
  "video ever leaves the device. Rescoped from a general 'sign language translator' brainstorm to the " +
  "real sub-problem a single-frame classifier can honestly do: individual letters, not whole signed " +
  "words or ASL grammar. J and Z are excluded since both require motion a static frame can't capture. " +
  "Measured held-out accuracy: 79% across 24 letters (chance is ~4%), evaluated on real photos never " +
  "included in the shipped classifier.";

export default function AslFingerspellingRecognitionPage() {
  useToolTracking("asl-fingerspelling-recognition");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "ASL Fingerspelling Recognition",
        summary: TOOL_SUMMARY,
        guide: ASL_FINGERSPELLING_GUIDE,
        suggestions: ASL_FINGERSPELLING_SUGGESTIONS,
      }} />

      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Home
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 12V6a1.5 1.5 0 013 0v5M11 11.5V4a1.5 1.5 0 013 0v7.5M14 11.5V6a1.5 1.5 0 013 0v6.5M17 12.5v-3a1.5 1.5 0 013 0V15c0 3.5-2.5 6-6 6h-2c-2.5 0-4-1-5.5-3L4 14.5c-.5-.8-.2-1.7.5-2s1.5 0 2 .6L8 15" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>ASL Fingerspelling Recognition</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Live ASL alphabet letter recognition from your webcam — fingerspelling, not translation
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

          <AslFingerspellingUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <AslFingerspellingRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
