"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import AiCodeDetectorRunner from "./AiCodeDetectorRunner";
import AiCodeDetectorUserGuideModal from "./AiCodeDetectorUserGuideModal";
import { AI_CODE_DETECTOR_GUIDE, AI_CODE_DETECTOR_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#428079";

const TOOL_SUMMARY =
  "Paste a code snippet — surfaces documented stylometric signals (comment density, generic naming, docstring " +
  "format, exception-handling style, boilerplate phrasing) plus an independent LLM opinion, side by side. " +
  "Never outputs a probability or an \"AI-written\" verdict — no reliable general detector exists, and this " +
  "tool is built to avoid overclaiming rather than around a fabricated confidence score.";

export default function AiCodeDetectorPage() {
  useToolTracking("ai-code-detector");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("ai-code-detector")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "AI-Generated Code Detector",
        summary: TOOL_SUMMARY,
        guide: AI_CODE_DETECTOR_GUIDE,
        suggestions: AI_CODE_DETECTOR_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 py-1 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {toolBackLabel("ai-code-detector")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M8 4L3 12l5 8M16 4l5 8-5 8" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 4.5l-3 15" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>AI-Generated Code Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Signals, Not A Verdict
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Documented stylometric signals + an independent LLM opinion — never a confidence score
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

          <AiCodeDetectorUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <AiCodeDetectorRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
