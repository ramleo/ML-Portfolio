"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import AstroAnomalyRunner from "./AstroAnomalyRunner";
import AstroAnomalyUserGuideModal from "./AstroAnomalyUserGuideModal";
import { ASTRO_ANOMALY_GUIDE, ASTRO_ANOMALY_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#3c7d9b";

const TOOL_SUMMARY =
  "Upload 5-30 photos from one fixed-tripod night-sky session — detects meteor/satellite streaks via frame " +
  "differencing + Hough transform (the real technique operational detectors use), distinguishing a star's dipole " +
  "drift signature from a transient monopole streak. Also returns a median-stacked \"clean\" image. Deliberately " +
  "does not attempt a meteor-vs-satellite verdict, since that was tested and found unreliable with position drift " +
  "alone. Pure classical OpenCV, no neural network, no GPU needed.";

export default function AstroAnomalyDetectorPage() {
  useToolTracking("astrophotography-anomaly-detector");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("astrophotography-anomaly-detector")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Astrophotography Anomaly Detector",
        summary: TOOL_SUMMARY,
        guide: ASTRO_ANOMALY_GUIDE,
        suggestions: ASTRO_ANOMALY_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {toolBackLabel("astrophotography-anomaly-detector")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M10.06 10.06L21 3l-7.06 10.94" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.94 7.44L4 21l8.5-3.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="4.5" cy="19.5" r="1" fill={ACCENT}/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Astrophotography Anomaly Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Frame Diff + Hough
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Detect meteor/satellite streaks across a night-sky photo session — classical CV, no neural network
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

          <AstroAnomalyUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <AstroAnomalyRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
