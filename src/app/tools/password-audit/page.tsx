"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordAuditRunner from "./PasswordAuditRunner";
import PasswordAuditUserGuideModal from "./PasswordAuditUserGuideModal";
import { PASSWORD_AUDIT_GUIDE, PASSWORD_AUDIT_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#428079";

const TOOL_SUMMARY =
  "Type a password to score its real strength (zxcvbn — pattern-matching against dictionaries/keyboard-walks/" +
  "dates/repeats, not naive character-class counting) entirely in your browser, then optionally check it against " +
  "Have I Been Pwned's breach database via k-anonymity: only a 5-character SHA-1 hash prefix is ever sent, never " +
  "the password or the full hash. No backend, no API key, nothing stored.";

export default function PasswordAuditPage() {
  useToolTracking("password-audit");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("password-audit")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Password Strength & Breach Checker",
        summary: TOOL_SUMMARY,
        guide: PASSWORD_AUDIT_GUIDE,
        suggestions: PASSWORD_AUDIT_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"password-audit"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16.5" cy="7.5" r="0.6" fill={ACCENT}/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Password Strength & Breach Checker</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Real zxcvbn strength scoring + an on-demand k-anonymity breach lookup, never sending the password itself
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

          <PasswordAuditUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PasswordAuditRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
