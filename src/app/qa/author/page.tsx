"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import AuthorRunner from "./AuthorRunner";
import AuthorUserGuideModal from "./AuthorUserGuideModal";
import { QA_GUIDE, QA_SUGGESTIONS } from "./userGuide";

const ACCENT = "#14b8a6";

const TOOL_SUMMARY =
  "The Author stage of Testwright: describe a browser test in plain English and get a complete, " +
  "runnable Playwright test in TypeScript. A free LLM turns the steps into a test that uses resilient " +
  "locators — accessible role and name, label, visible text — with a short comment on each choice and " +
  "real assertions. Generation only; running against the site is the next stage.";

export default function AuthorPage() {
  useToolTracking("qa-test-author");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Testwright — Author",
        summary: TOOL_SUMMARY,
        guide: QA_GUIDE,
        suggestions: QA_SUGGESTIONS,
      }} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Author</h1>
            <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
              style={{ background: "#34d39918", color: "#34d399", border: "1px solid #34d39955" }}>● Live</span>
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
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          User Guide
        </button>
      </div>

      <AuthorUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <AuthorRunner accent={ACCENT} />
    </div>
  );
}
