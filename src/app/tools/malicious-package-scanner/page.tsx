"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PackageScannerRunner from "./PackageScannerRunner";
import PackageScannerUserGuideModal from "./PackageScannerUserGuideModal";
import { PACKAGE_SCANNER_GUIDE, PACKAGE_SCANNER_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#966f2b";

const TOOL_SUMMARY =
  "Paste a package.json/requirements.txt or a JS/TS/Python source file and it's checked with real, published " +
  "static-analysis heuristics (GuardDog-style): suspicious npm lifecycle install scripts, dependency-name " +
  "typosquats against a curated list of well-known packages, suspicious dynamic-execution API calls " +
  "(eval/exec/subprocess), high-entropy obfuscated string literals, and embedded network URLs. Pattern " +
  "matching, not signature comparison — can flag never-before-seen malicious packages. Fully client-side.";

export default function MaliciousPackageScannerPage() {
  useToolTracking("malicious-package-scanner");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("malicious-package-scanner")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Malicious Package Scanner",
        summary: TOOL_SUMMARY,
        guide: PACKAGE_SCANNER_GUIDE,
        suggestions: PACKAGE_SCANNER_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"malicious-package-scanner"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 4v6c0 4.5-3.4 7.6-8 8-4.6-.4-8-3.5-8-8V7l8-4z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Malicious Package Scanner</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                GuardDog-style static analysis for npm/PyPI supply-chain attacker techniques
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

          <PackageScannerUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PackageScannerRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
