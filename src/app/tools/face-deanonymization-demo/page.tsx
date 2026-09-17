"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import FaceReidDemoRunner from "./FaceReidDemoRunner";
import FaceReidUserGuideModal from "./FaceReidUserGuideModal";
import { FACE_REID_GUIDE, FACE_REID_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#a06840";

const TOOL_SUMMARY =
  "Upload a target photo and a small gallery of other photos — runs a real face-embedding similarity search " +
  "(the same mechanism facial-recognition re-identification systems use) to rank the closest match, then lets " +
  "you cloak the target (Face Cloak's technique) and re-test whether the match breaks. Never searches the internet.";

export default function FaceDeanonymizationDemoPage() {
  useToolTracking("face-deanonymization-demo");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("face-deanonymization-demo")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Face Deanonymization Risk Demo",
        summary: TOOL_SUMMARY,
        guide: FACE_REID_GUIDE,
        suggestions: FACE_REID_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"face-deanonymization-demo"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M20 20l-4.5-4.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="2.5" stroke={ACCENT} strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Face Deanonymization Risk Demo</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                See a real face-embedding similarity match, then test whether Face Cloak&apos;s protection breaks it
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

          <FaceReidUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <FaceReidDemoRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
