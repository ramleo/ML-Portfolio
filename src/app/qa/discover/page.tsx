"use client";

import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import DiscoverRunner from "./DiscoverRunner";
import { QA_WORLD_GUIDE, QA_WORLD_SUGGESTIONS } from "../worldGuide";

const ACCENT = "#14b8a6";

const TOOL_SUMMARY =
  "The Discover stage of Testwright: give an own-site URL and it renders the page on an isolated CI " +
  "runner, reads the accessibility snapshot, and proposes candidate end-to-end test cases. Pick the " +
  "ones you want and it drafts each as a Playwright test to send to Run.";

export default function DiscoverPage() {
  useToolTracking("qa-discover");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Testwright — Discover",
        summary: TOOL_SUMMARY,
        guide: QA_WORLD_GUIDE,
        suggestions: QA_WORLD_SUGGESTIONS,
      }} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <circle cx="11" cy="11" r="7" strokeLinecap="round" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Discover</h1>
            <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
              style={{ background: "#34d39918", color: "#34d399", border: "1px solid #34d39955" }}>● Live</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
            Render a page, read its structure, and propose test cases to draft and run
          </p>
        </div>
      </div>

      <DiscoverRunner accent={ACCENT} />
    </div>
  );
}
