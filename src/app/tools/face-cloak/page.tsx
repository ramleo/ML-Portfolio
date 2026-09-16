"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import FaceCloakRunner from "./FaceCloakRunner";
import FaceCloakUserGuideModal from "./FaceCloakUserGuideModal";
import { FACE_CLOAK_GUIDE, FACE_CLOAK_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#8164c4";

const TOOL_SUMMARY =
  "Upload a personal photo and this tool adds an imperceptible adversarial perturbation to the " +
  "face region, pushing that face's embedding away from where a face-recognition model naturally " +
  "places it — a simplified, honest version of the real Fawkes privacy-cloaking technique used to " +
  "counter unauthorized facial-recognition scrapers. Reports the real cosine-similarity drop, and " +
  "discloses openly that this protects only the specific cloaked photo, not copies already online.";

export default function FaceCloakPage() {
  useToolTracking("face-cloak");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("face-cloak")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Face Cloak",
        summary: TOOL_SUMMARY,
        guide: FACE_CLOAK_GUIDE,
        suggestions: FACE_CLOAK_SUGGESTIONS,
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
            {toolBackLabel("face-cloak")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7v6c0 5 4 9 10 9s10-4 10-9V7l-10-5z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="12" cy="11" r="2.5" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M8 16c0.8-1.5 2.2-2.3 4-2.3s3.2 0.8 4 2.3" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Face Cloak</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Fawkes-style privacy cloaking — disrupt a photo&apos;s face embedding to resist unauthorized facial recognition
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

          <FaceCloakUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <FaceCloakRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
