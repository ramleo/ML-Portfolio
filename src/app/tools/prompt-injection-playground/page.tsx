"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PromptInjectionRunner from "./PromptInjectionRunner";
import PromptInjectionUserGuideModal from "./PromptInjectionUserGuideModal";
import { PROMPT_INJECTION_GUIDE, PROMPT_INJECTION_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#8164c4";

const TOOL_SUMMARY =
  "Paste a prompt or a document an AI might be asked to read — checks it for prompt injection using a transparent " +
  "pattern-matching layer (direct override, jailbreak, indirect, encoding tricks) plus an independent LLM judge. " +
  "No detector here is 100% reliable, and that limitation is disclosed, not hidden.";

export default function PromptInjectionPlaygroundPage() {
  useToolTracking("prompt-injection-playground");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("prompt-injection-playground")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "LLM Prompt Injection Detection Playground",
        summary: TOOL_SUMMARY,
        guide: PROMPT_INJECTION_GUIDE,
        suggestions: PROMPT_INJECTION_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"prompt-injection-playground"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9.5 12l1.8 1.8L14.5 10" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>LLM Prompt Injection Detection Playground</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Pattern + LLM Judge
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Test text against a documented injection-pattern library and an independent LLM judge
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

          <PromptInjectionUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PromptInjectionRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
