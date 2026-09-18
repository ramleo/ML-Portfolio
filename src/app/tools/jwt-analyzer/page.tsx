"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import JwtAnalyzerRunner from "./JwtAnalyzerRunner";
import JwtAnalyzerUserGuideModal from "./JwtAnalyzerUserGuideModal";
import { JWT_GUIDE, JWT_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#8b6fc9";

const TOOL_SUMMARY =
  "Paste a JSON Web Token and it decodes it and audits it for the mistakes that cause real token " +
  "breaches: alg:none, missing or over-long expiry, sensitive data in the payload, and — for HMAC " +
  "tokens — a real in-browser weak-secret test against a built-in list plus any wordlist you paste. " +
  "Everything runs locally; the token never leaves the page.";

export default function JwtAnalyzerPage() {
  useToolTracking("jwt-analyzer");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "JWT / Token Security Analyzer",
        summary: TOOL_SUMMARY,
        guide: JWT_GUIDE,
        suggestions: JWT_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"jwt-analyzer"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="15" r="4" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M10.85 12.15 19 4M18 5l2 2M15 8l2 2" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>JWT / Token Security Analyzer</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Client-Side · Real Web Crypto
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Decode a JWT and audit it — including a real in-browser weak-secret test
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

          <JwtAnalyzerUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <JwtAnalyzerRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
