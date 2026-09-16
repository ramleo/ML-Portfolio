"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import CrimeSceneReconstructionRunner from "./CrimeSceneReconstructionRunner";
import CrimeSceneUserGuideModal from "./CrimeSceneUserGuideModal";
import { CRIME_SCENE_GUIDE, CRIME_SCENE_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#a96161";

const TOOL_SUMMARY =
  "Upload 2-6 photos of the same static scene from different angles — runs a real, sparse Structure-from-Motion " +
  "pipeline (SIFT feature matching, essential-matrix pose estimation, incremental PnP registration, triangulation) " +
  "to reconstruct a colored 3D point cloud and camera positions. No bundle adjustment, no camera calibration, no " +
  "dense mesh — an educational demonstration of the real photogrammetry technique, not a forensic-grade tool.";

export default function CrimeSceneReconstructionPage() {
  useToolTracking("crime-scene-reconstruction");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("crime-scene-reconstruction")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Crime Scene Reconstruction",
        summary: TOOL_SUMMARY,
        guide: CRIME_SCENE_GUIDE,
        suggestions: CRIME_SCENE_SUGGESTIONS,
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
            {toolBackLabel("crime-scene-reconstruction")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 2v20M3 7l9 5 9-5" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Crime Scene Reconstruction</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Sparse SfM
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Real structure-from-motion from multiple photos — sparse point cloud + camera poses, not a forensic tool
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

          <CrimeSceneUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <CrimeSceneReconstructionRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
