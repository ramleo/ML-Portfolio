"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PhishingEmailRunner from "./PhishingEmailRunner";
import PhishingEmailUserGuideModal from "./PhishingEmailUserGuideModal";
import { PHISHING_EMAIL_GUIDE, PHISHING_EMAIL_SUGGESTIONS } from "./userGuide";
import { MEASURED_HELD_OUT_ACCURACY } from "./emailBodyClassifier";

const ACCENT = "#e11d48";

const TOOL_SUMMARY =
  "Paste an email's body text and a Naive Bayes classifier (trained on real phishing + legitimate emails, " +
  `${Math.round(MEASURED_HELD_OUT_ACCURACY * 100)}% measured held-out accuracy) scores the language itself — ` +
  "urgency phrasing, generic greetings, manipulative wording — not the URL/headers/DNS this site's other " +
  "phishing tools already cover. Shows real top contributing words as evidence, plus an independent " +
  "rule-based flag list. Fully client-side, zero backend, zero API cost.";

export default function PhishingEmailClassifierPage() {
  useToolTracking("phishing-email-classifier");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Phishing Email Body Classifier",
        summary: TOOL_SUMMARY,
        guide: PHISHING_EMAIL_GUIDE,
        suggestions: PHISHING_EMAIL_SUGGESTIONS,
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
                <rect x="3" y="5" width="18" height="14" rx="2" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M3 7l9 6 9-6" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.5 15.5l3 3M18.5 15.5l-3 3" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Phishing Email Body Classifier</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Naive Bayes over the email&apos;s own language — {Math.round(MEASURED_HELD_OUT_ACCURACY * 100)}% measured held-out accuracy
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

          <PhishingEmailUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PhishingEmailRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
