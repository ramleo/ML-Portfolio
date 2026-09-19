"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import ToolBackNav from "@/components/ToolBackNav";
import QaTestAuthorRunner from "./QaTestAuthorRunner";
import QaTestAuthorUserGuideModal from "./QaTestAuthorUserGuideModal";
import { QA_GUIDE, QA_SUGGESTIONS } from "./userGuide";

const ACCENT = "#c47d1a";

const TOOL_SUMMARY =
  "Describe a browser test in plain English and get a complete, runnable Playwright test in " +
  "TypeScript. A free LLM turns the steps into a test that uses resilient locators — accessible " +
  "role and name, label, visible text — instead of brittle CSS or positional selectors, each with a " +
  "short comment on why it is stable, and real assertions at the end. This phase generates the test " +
  "only; it does not run anything, so there is no execution against any site here.";

export default function QaTestAuthorPage() {
  useToolTracking("qa-test-author");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "QA Test Author",
        summary: TOOL_SUMMARY,
        guide: QA_GUIDE,
        suggestions: QA_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"qa-test-author"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 3h6M10 3v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 14h8" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>QA Test Author</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Playwright · TypeScript
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Plain-English steps into a runnable Playwright test with resilient locators
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

          <QaTestAuthorUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <QaTestAuthorRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
