"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import VisualRunner from "./VisualRunner";
import { QA_WORLD_GUIDE, QA_WORLD_SUGGESTIONS } from "../worldGuide";

const ACCENT = "#14b8a6";

const TOOL_SUMMARY =
  "The Visual stage of Testwright: screenshot a page on an isolated GitHub Actions runner, save it as a " +
  "baseline in the browser, then re-shoot later and diff the two pixel-for-pixel — a red overlay and a " +
  "% changed flag catch unintended visual regressions. Best on static pages; animated/WebGL sections read as changed.";

export default function VisualPage() {
  useToolTracking("qa-visual");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Testwright — Visual",
        summary: TOOL_SUMMARY,
        guide: QA_WORLD_GUIDE,
        suggestions: QA_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="Testwright — Visual" accent={ACCENT} guide={QA_WORLD_GUIDE} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <rect x="3" y="4" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="10" r="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 15l4-3 3 2 4-4 7 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Visual</h1>
            <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
              style={{ background: "#34d39918", color: "#34d399", border: "1px solid #34d39955" }}>● Live</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
            Baseline a page, then diff later captures pixel-for-pixel to catch visual regressions
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

      <VisualRunner accent={ACCENT} />
    </div>
  );
}
