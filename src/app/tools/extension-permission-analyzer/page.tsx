"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import ExtensionAnalyzerRunner from "./ExtensionAnalyzerRunner";
import ExtensionAnalyzerUserGuideModal from "./ExtensionAnalyzerUserGuideModal";
import { EXTENSION_ANALYZER_GUIDE, EXTENSION_ANALYZER_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#85733d";

const TOOL_SUMMARY =
  "Paste a Chrome/Edge extension's manifest.json — checks declared permissions and host access against a " +
  "documented risk taxonomy, flagging high-risk permissions and known dangerous combinations (e.g. broad host " +
  "access + network interception + cookie access). Static analysis only, entirely client-side.";

export default function ExtensionPermissionAnalyzerPage() {
  useToolTracking("extension-permission-analyzer");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("extension-permission-analyzer")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Browser Extension Permission Risk Analyzer",
        summary: TOOL_SUMMARY,
        guide: EXTENSION_ANALYZER_GUIDE,
        suggestions: EXTENSION_ANALYZER_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 py-1 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {toolBackLabel("extension-permission-analyzer")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={ACCENT} strokeWidth="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={ACCENT} strokeWidth="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M17.5 14v3.5M17.5 17.5H21M17.5 21v-3.5M17.5 17.5H14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Browser Extension Permission Risk Analyzer</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side Only
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Paste a manifest.json and check it against a documented permission-risk taxonomy
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

          <ExtensionAnalyzerUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <ExtensionAnalyzerRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
