"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import GaitComparisonRunner from "./GaitComparisonRunner";
import GaitComparisonUserGuideModal from "./GaitComparisonUserGuideModal";
import { GAIT_COMPARISON_GUIDE, GAIT_COMPARISON_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#678042";

const TOOL_SUMMARY =
  "Upload two side-view walking videos — tracks body pose with MediaPipe (reusing Movement Form " +
  "Comparison's pipeline), detects repeating gait cycles from knee-angle peaks, and compares the two " +
  "videos' averaged stride-cycle joint-angle curves. Not a validated biometric identification technique " +
  "— shows whether two clips have a similar walking pattern, never proof of identity.";

export default function GaitPatternComparisonPage() {
  useToolTracking("gait-pattern-comparison");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("gait-pattern-comparison")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Gait Pattern Comparison",
        summary: TOOL_SUMMARY,
        guide: GAIT_COMPARISON_GUIDE,
        suggestions: GAIT_COMPARISON_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"gait-pattern-comparison"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="2" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M12 7v5l-3 3M12 12l4 2M9 15l-2 6M13 14l3 7" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Gait Pattern Comparison</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Compares two walking videos&apos; gait-cycle joint angles — not a biometric identity tool
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

          <GaitComparisonUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <GaitComparisonRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
