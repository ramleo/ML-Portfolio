"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import AnomalyRunner from "./AnomalyRunner";
import AnomalyUserGuideModal from "./AnomalyUserGuideModal";
import { ANOMALY_GUIDE, ANOMALY_SUGGESTIONS } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#4f8fb0";

const TOOL_SUMMARY =
  "A live security-log monitor: a real scikit-learn Isolation Forest learns what normal web " +
  "traffic looks like, then flags anomalies — brute-force floods, scrapers, oversized payloads, " +
  "off-hours bursts — in a rolling feed. The traffic is simulated and labelled, and the model is " +
  "scored honestly against ground truth it never sees, so it can be caught missing an attack.";

export default function AnomalyDetectionPage() {
  useToolTracking("anomaly-detection");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Log Anomaly Detector",
        summary: TOOL_SUMMARY,
        guide: ANOMALY_GUIDE,
        suggestions: ANOMALY_SUGGESTIONS,
      }} />

      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <ToolBackNav toolId={"anomaly-detection"} />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h3l2 6 4-14 2 8h2l1.5 3H21" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Log Anomaly Detector</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Live Engine · Isolation Forest
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Watch a real anomaly-detection model flag attacks in a live traffic feed
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

          <AnomalyUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <AnomalyRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
