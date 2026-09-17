"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import QrPhishingRunner from "./QrPhishingRunner";
import QrPhishingUserGuideModal from "./QrPhishingUserGuideModal";
import { QR_PHISHING_GUIDE, QR_PHISHING_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#a06840";

const TOOL_SUMMARY =
  "Upload a photo/screenshot containing a QR code, or type a URL directly — decoded locally (OpenCV, no ML " +
  "model, no API cost) and checked for structural phishing/malicious-link signals (IP-literal hosts, " +
  "punycode domains, '@' auth-trick URLs, URL shorteners, suspicious TLDs, brand typosquats), a Google Safe " +
  "Browsing reputation lookup, and a free RDAP domain-age check. The link is never actually visited.";

export default function QrPhishingDetectorPage() {
  useToolTracking("qr-phishing-detector");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("qr-phishing-detector")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "QR Phishing Detector",
        summary: TOOL_SUMMARY,
        guide: QR_PHISHING_GUIDE,
        suggestions: QR_PHISHING_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"qr-phishing-detector"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke={ACCENT} strokeWidth="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke={ACCENT} strokeWidth="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>QR Phishing Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Decodes a QR code and flags structural phishing/malicious-link signals in its destination
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

          <QrPhishingUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <QrPhishingRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
