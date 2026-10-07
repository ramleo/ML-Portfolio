"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
import PoseVjRunner from "./PoseVjRunner";
import ToolGuideModal from "@/components/ToolGuideModal";
import { POSE_VJ_VISUALS_GUIDE } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#b247c2";

export default function PoseVjVisualsPage() {
  useToolTracking("pose-vj-visuals");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"pose-vj-visuals"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke={ACCENT} strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Pose VJ Visuals</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Hand movement (and optionally music) drives a real-time generative particle visual
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
            guide={POSE_VJ_VISUALS_GUIDE} title="Pose VJ Visuals" accent={ACCENT} toolId="pose-vj-visuals" />

          <PoseVjRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
