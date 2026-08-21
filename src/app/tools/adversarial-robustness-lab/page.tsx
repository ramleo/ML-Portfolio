"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import AdversarialRunner from "./AdversarialRunner";
import AdversarialUserGuideModal from "./AdversarialUserGuideModal";
import { ADVERSARIAL_GUIDE, ADVERSARIAL_SUGGESTIONS } from "./userGuide";

const ACCENT = "#f43f5e";

const TOOL_SUMMARY =
  "Upload a photo and craft an adversarial attack against a pretrained classifier — FGSM/PGD " +
  "(subtle, whole-image), a visible adversarial patch (a 'sticker' region), or a black-box " +
  "query-only attack with zero gradient access — untargeted or targeted at a specific ImageNet " +
  "label. Try two defenses (JPEG recompression, randomized smoothing) plus an optional " +
  "transferability check against a second model (ResNet18). Reports honestly whether the " +
  "defenses actually recovered the correct prediction, and whether a targeted black-box attack " +
  "even converges within a request-sized query budget (often it doesn't) — real limitations, " +
  "not bugs.";

export default function AdversarialRobustnessLabPage() {
  useToolTracking("adversarial-robustness-lab");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Adversarial Robustness Lab",
        summary: TOOL_SUMMARY,
        guide: ADVERSARIAL_GUIDE,
        suggestions: ADVERSARIAL_SUGGESTIONS,
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
                <path d="M12 2L2 7v6c0 5 4 9 10 9s10-4 10-9V7l-10-5z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Adversarial Robustness Lab</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Fool an image classifier with an adversarial perturbation, then see how well a defense actually recovers it
              </p>
            </div>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5 shrink-0"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
          </div>

          <AdversarialUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <AdversarialRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
