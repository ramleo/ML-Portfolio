"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import EmailAuthCheckerRunner from "./EmailAuthCheckerRunner";
import EmailAuthUserGuideModal from "./EmailAuthUserGuideModal";
import { EMAIL_AUTH_GUIDE, EMAIL_AUTH_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#3c7d9b";

const TOOL_SUMMARY =
  "Paste raw email headers — parses the receiving mail server's own Authentication-Results (SPF/DKIM/DMARC), " +
  "then runs independent live DNS checks against the sending domain's real SPF/DMARC records and DKIM key, plus " +
  "a From:-domain alignment check. Does not cryptographically verify the DKIM signature (needs the message body).";

export default function EmailAuthCheckerPage() {
  useToolTracking("email-auth-checker");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Email Header Authentication Checker",
        summary: TOOL_SUMMARY,
        guide: EMAIL_AUTH_GUIDE,
        suggestions: EMAIL_AUTH_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"email-auth-checker"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M3 6l9 7 9-7" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.5 15.5l1.8 1.8 3.2-3.6" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Email Header Authentication Checker</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Live DNS
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Paste raw email headers to check SPF/DKIM/DMARC against real, live DNS records
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

          <EmailAuthUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <EmailAuthCheckerRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
