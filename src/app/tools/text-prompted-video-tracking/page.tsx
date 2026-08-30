"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import RotoscopeTrackingRunner from "./RotoscopeTrackingRunner";
import RotoscopeUserGuideModal from "./RotoscopeUserGuideModal";
import { ROTOSCOPE_GUIDE, ROTOSCOPE_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#8465b9";

const TOOL_SUMMARY =
  "Upload a short video and type an object description (e.g. \"the red backpack\") — Grounding DINO finds " +
  "it in the first frame, then SAM2 tracks and masks it through the rest of the clip. Uses SAM2 + Grounding " +
  "DINO (\"Grounded-SAM\") instead of Meta's SAM3, since SAM3's checkpoints are currently gated behind a " +
  "Meta access request. Output is a sampled-frame preview, not a full-resolution exported video.";

export default function TextPromptedVideoTrackingPage() {
  useToolTracking("text-prompted-video-tracking");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("text-prompted-video-tracking")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Text-Prompted Video Object Tracking",
        summary: TOOL_SUMMARY,
        guide: ROTOSCOPE_GUIDE,
        suggestions: ROTOSCOPE_SUGGESTIONS,
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
            {toolBackLabel("text-prompted-video-tracking")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 7l4-3 4 3 4-3 4 3v10l-4 3-4-3-4 3-4-3V7z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke={ACCENT} strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Text-Prompted Video Object Tracking</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Grounded-SAM
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Type what to track — Grounding DINO + SAM2 mask it through the whole clip, not SAM3
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

          <RotoscopeUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <RotoscopeTrackingRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
