"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import CaptchaHardeningRunner from "./CaptchaHardeningRunner";
import CaptchaHardeningUserGuideModal from "./CaptchaHardeningUserGuideModal";
import { CAPTCHA_HARDENING_GUIDE, CAPTCHA_HARDENING_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#966f2b";

const TOOL_SUMMARY =
  "Upload a CAPTCHA-style image — a vision-language model attempts to read it, then a hardening slider stacks " +
  "three classic, model-agnostic perturbations (noise, occlusion wave, reduced contrast) and the model tries " +
  "again. Only reads images you upload, never contacts a live CAPTCHA.";

export default function CaptchaHardeningLabPage() {
  useToolTracking("captcha-hardening-lab");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("captcha-hardening-lab")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "CAPTCHA Hardening Lab",
        summary: TOOL_SUMMARY,
        guide: CAPTCHA_HARDENING_GUIDE,
        suggestions: CAPTCHA_HARDENING_SUGGESTIONS,
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
            {toolBackLabel("captcha-hardening-lab")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="10.5" cy="10.5" r="7.5" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M21 21l-4.35-4.35" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>CAPTCHA Hardening Lab</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Security Research
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                How easily a vision-language model reads a CAPTCHA, and what hardening actually defeats it
              </p>
            </div>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
              style={{ marginLeft: "auto", borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
            <ThemeToggle />
          </div>

          <CaptchaHardeningUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <CaptchaHardeningRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
