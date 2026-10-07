"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
import FaceLivenessRunner from "./FaceLivenessRunner";
import ToolGuideModal from "@/components/ToolGuideModal";
import { FACE_LIVENESS_GUIDE } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#428079";

export default function FaceLivenessPage() {
  useToolTracking("face-liveness");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"face-liveness"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Face Liveness Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Real vs. Spoofed
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Distinguishes a live face from a photo/screen spoof held up to the camera
              </p>
            </div>
            <div className="flex items-center gap-2" style={{ marginLeft: "auto" }}>
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
          </div>

          <ToolGuideModal open={guideOpen} onClose={() => setGuideOpen(false)}
            guide={FACE_LIVENESS_GUIDE} title="Face Liveness Detector" accent={ACCENT} toolId="face-liveness" />

          <FaceLivenessRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
