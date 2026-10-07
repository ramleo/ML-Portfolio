"use client";

import Link from "next/link";
import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
import ToolGuideModal from "@/components/ToolGuideModal";
import { RAG_ANALYTICS_GUIDE } from "./userGuide";
import AnalyticsContent from "./AnalyticsContent";

const ACCENT = "#38bdf8";

export default function RagAnalyticsPage() {
  useToolTracking("rag-analytics");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <div role="main" className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <nav aria-label="Breadcrumb" className="tool-back-nav">
            <Link href="/" className="tool-back-link">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Home
            </Link>
            <Link href="/tools/multimodal-rag" className="tool-back-link">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Multimodal RAG
            </Link>
          </nav>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>RAG Usage Analytics</h1>
            <div className="flex items-center gap-2">
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
          </div>

          <ToolGuideModal open={guideOpen} onClose={() => setGuideOpen(false)}
            guide={RAG_ANALYTICS_GUIDE} title="RAG Usage Analytics" accent={ACCENT} toolId="rag-analytics" />

          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
}