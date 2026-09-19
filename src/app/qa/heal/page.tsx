"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import HealRunner from "./HealRunner";
import { QA_WORLD_GUIDE, QA_WORLD_SUGGESTIONS } from "../worldGuide";

const ACCENT = "#14b8a6";

const TOOL_SUMMARY =
  "The Heal stage of Testwright: run your saved tests as a suite, group the failures by root cause " +
  "('1 issue · N tests'), and self-heal each group in one click — re-resolving broken locators and " +
  "re-running. Fixes locators, not real bugs.";

export default function HealPage() {
  useToolTracking("qa-heal");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Testwright — Heal",
        summary: TOOL_SUMMARY,
        guide: QA_WORLD_GUIDE,
        suggestions: QA_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="Testwright — Heal" accent={ACCENT} guide={QA_WORLD_GUIDE} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Heal</h1>
            <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
              style={{ background: "#34d39918", color: "#34d399", border: "1px solid #34d39955" }}>● Live</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
            Run the suite, group failures by root cause, and heal each group in one click
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

      <HealRunner accent={ACCENT} />
    </div>
  );
}
