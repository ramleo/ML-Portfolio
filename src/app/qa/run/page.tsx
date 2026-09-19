"use client";

import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import RunRunner from "./RunRunner";
import { QA_WORLD_GUIDE, QA_WORLD_SUGGESTIONS } from "../worldGuide";

const ACCENT = "#14b8a6";

const TOOL_SUMMARY =
  "The Run stage of Testwright: execute a generated Playwright test on an isolated, ephemeral GitHub " +
  "Actions runner against our own site — never in the browser or on the app server. Returns pass/fail, " +
  "a summary, and a failure screenshot, with a link to the full run's video and trace.";

export default function RunPage() {
  useToolTracking("qa-run");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Testwright — Run",
        summary: TOOL_SUMMARY,
        guide: QA_WORLD_GUIDE,
        suggestions: QA_WORLD_SUGGESTIONS,
      }} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Run</h1>
            <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
              style={{ background: "#34d39918", color: "#34d399", border: "1px solid #34d39955" }}>● Live</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
            Execute a Playwright test on isolated CI — pass/fail, summary, and a failure screenshot
          </p>
        </div>
      </div>

      <RunRunner accent={ACCENT} />
    </div>
  );
}
