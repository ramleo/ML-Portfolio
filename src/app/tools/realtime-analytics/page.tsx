"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import { ANALYTICS_GUIDE, ANALYTICS_SUGGESTIONS } from "./userGuide";
import { PipelineProvider } from "@/context/PipelineContext";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#40816c";

export default function RealtimeAnalyticsPage() {
  useToolTracking("realtime-analytics");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("realtime-analytics")), [router]);

  return (
    <PipelineProvider>
      <div className="relative min-h-screen text-[var(--text)] overflow-x-hidden">
        <ConstellationBackground />
        <ToolsAIChat context={{
          accent: ACCENT,
          tool: "Real-Time Analytics Dashboard",
          summary: "Live event tracking for the ml-portfolio site. Events (page views, tool opens) are ingested via FastAPI, stored in Supabase PostgreSQL, and streamed to this dashboard via Supabase Realtime WebSocket subscriptions.",
          guide: ANALYTICS_GUIDE,
          suggestions: ANALYTICS_SUGGESTIONS,
        }} />

        <div role="main" className="relative z-10 flex flex-col gap-6 pt-6">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <ToolBackNav toolId={"realtime-analytics"} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${ACCENT}20` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2.5" fill={ACCENT}/>
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke={ACCENT} strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" stroke={ACCENT} strokeWidth="1.1" strokeLinecap="round" opacity="0.5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Real-Time Analytics</h1>
                <p className="text-xs text-[var(--text2)]">Live event stream from this portfolio — powered by Supabase Realtime</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <ThemeToggle />
              </div>
            </div>
          </div>

          <AnalyticsDashboard />
        </div>
      </div>
    </PipelineProvider>
  );
}