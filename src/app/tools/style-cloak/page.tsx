"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import StyleCloakRunner from "./StyleCloakRunner";
import StyleCloakUserGuideModal from "./StyleCloakUserGuideModal";
import { STYLE_CLOAK_GUIDE, STYLE_CLOAK_SUGGESTIONS } from "./userGuide";

const ACCENT = "#ec4899";

const TOOL_SUMMARY =
  "Upload an image and this tool adds an imperceptible adversarial perturbation across the whole " +
  "image, pushing its CLIP embedding away from where it naturally sits — a simplified, honest " +
  "version of the real Glaze/Nightshade artist-protection technique used to counter unauthorized AI " +
  "style-mimicry. Reports the real cosine-similarity drop, calibrated against a measured unrelated-" +
  "image baseline, and discloses openly that this protects only the specific cloaked image, not " +
  "copies already scraped elsewhere.";

export default function StyleCloakPage() {
  useToolTracking("style-cloak");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Style Cloak",
        summary: TOOL_SUMMARY,
        guide: STYLE_CLOAK_GUIDE,
        suggestions: STYLE_CLOAK_SUGGESTIONS,
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
            Home
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 22c-5 0-9-4-9-9a9 9 0 0118 0c0 2-1.5 3-3.5 3H15a1.5 1.5 0 00-1 2.6c.4.4.6.9.6 1.4 0 1.1-1.2 2-2.6 2z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="7.5" cy="10.5" r="1.2" fill={ACCENT}/>
                <circle cx="11" cy="7" r="1.2" fill={ACCENT}/>
                <circle cx="15.5" cy="8.5" r="1.2" fill={ACCENT}/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Style Cloak</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Glaze/Nightshade-style artist protection — disrupt an image&apos;s CLIP embedding to resist unauthorized AI style-mimicry
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

          <StyleCloakUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <StyleCloakRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
