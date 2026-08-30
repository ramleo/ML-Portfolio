"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import YaraScanRunner from "./YaraScanRunner";
import YaraScanUserGuideModal from "./YaraScanUserGuideModal";
import { YARA_SCAN_GUIDE, YARA_SCAN_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#b91c1c";

const TOOL_SUMMARY =
  "Upload a file and it's scanned with the real, open-source YARA pattern-matching engine — the " +
  "actual industry-standard tool AV/EDR/threat-intel teams use. Scan with a small built-in " +
  "educational rule set, or write and test your own YARA rule against the file. Never executes the " +
  "file; every result is real matched evidence, never a fabricated verdict.";

export default function YaraFileScannerPage() {
  useToolTracking("yara-file-scanner");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("yara-file-scanner")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "YARA File Scanner",
        summary: TOOL_SUMMARY,
        guide: YARA_SCAN_GUIDE,
        suggestions: YARA_SCAN_SUGGESTIONS,
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
            {toolBackLabel("yara-file-scanner")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a5 5 0 00-5 5v1H6a2 2 0 00-2 2v2a8 8 0 004 6.93V20a2 2 0 002 2h4a2 2 0 002-2v-1.07A8 8 0 0020 12v-2a2 2 0 00-2-2h-1V7a5 5 0 00-5-5z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 10h8M4 12h2M18 12h2" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>YARA File Scanner</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Live Engine · Real YARA
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Scan a file with real YARA rules, or write and test your own
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

          <YaraScanUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <YaraScanRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
