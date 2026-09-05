"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import DnsTunnelRunner from "./DnsTunnelRunner";
import DnsTunnelUserGuideModal from "./DnsTunnelUserGuideModal";
import { DNS_TUNNEL_GUIDE, DNS_TUNNEL_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#8164c4";

const TOOL_SUMMARY =
  "Paste a DNS query log (one hostname per line) or check a single hostname, and it's analyzed with real, " +
  "published DNS tunneling/exfiltration detection heuristics (MITRE ATT&CK T1071.004): subdomain length, " +
  "Shannon entropy, and query volume per parent domain — a parent domain is only flagged when multiple " +
  "signals agree, never a single one alone. Fully client-side, zero backend, zero ML model.";

export default function DnsTunnelingDetectorPage() {
  useToolTracking("dns-tunneling-detector");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("dns-tunneling-detector")), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "DNS Tunneling / Exfiltration Detector",
        summary: TOOL_SUMMARY,
        guide: DNS_TUNNEL_GUIDE,
        suggestions: DNS_TUNNEL_SUGGESTIONS,
      }} />

      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-32">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {toolBackLabel("dns-tunneling-detector")}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="2.2" stroke={ACCENT} strokeWidth="1.5"/>
                <circle cx="5" cy="19" r="2.2" stroke={ACCENT} strokeWidth="1.5"/>
                <circle cx="19" cy="19" r="2.2" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M12 7.2v4M12 11.2L6.6 16.8M12 11.2l5.4 5.6" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>DNS Tunneling / Exfiltration Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Local · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Length + entropy + query-volume heuristics on a pasted DNS log — real technique, no ML model
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

          <DnsTunnelUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <DnsTunnelRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
