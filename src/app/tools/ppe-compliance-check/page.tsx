"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PpeComplianceRunner from "./PpeComplianceRunner";
import PpeComplianceUserGuideModal from "./PpeComplianceUserGuideModal";
import { PPE_COMPLIANCE_GUIDE, PPE_COMPLIANCE_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#a0684b";

const TOOL_SUMMARY =
  "Upload a photo and this detects each person and checks whether a hard hat and safety vest are visible " +
  "on them, using a dedicated PPE-detection model (the site's general object detector has no safety-vest " +
  "class at all). Compliance is read from explicit present/absent signals the model was trained on, never " +
  "guessed from a lack of detection — a person the model can't confidently read either way is labeled " +
  "\"unclear.\" Verified with real photos: correctly detected both items on clear worker photos (0.39-0.88 " +
  "confidence) and correctly avoided a false compliance claim on a photo of gear lying on the ground.";

export default function PpeComplianceCheckPage() {
  useToolTracking("ppe-compliance-check");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("ppe-compliance-check")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "PPE Compliance Check",
        summary: TOOL_SUMMARY,
        guide: PPE_COMPLIANCE_GUIDE,
        suggestions: PPE_COMPLIANCE_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"ppe-compliance-check"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 18h16a2 2 0 00-2-2H6a2 2 0 00-2 2z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M6 16v-1a6 6 0 0112 0v1" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M2 18h20" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>PPE Compliance Check</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  YOLOv8n PPE
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Hard hat + safety vest detection per person, with explicit present/absent/unclear labels
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

          <PpeComplianceUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PpeComplianceRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
