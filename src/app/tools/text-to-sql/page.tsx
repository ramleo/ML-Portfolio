"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import { PipelineProvider } from "@/context/PipelineContext";
import TextToSqlRunner from "./TextToSqlRunner";
import { TEXT_TO_SQL_GUIDE, TEXT_TO_SQL_SUGGESTIONS } from "./userGuide";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

const ACCENT = "#6a6cc8";

export default function TextToSqlPage() {
  useToolTracking("text-to-sql");
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref("text-to-sql")), [router]);

  return (
    <PipelineProvider>
      <div className="relative min-h-screen text-[var(--text)] overflow-x-hidden">
        <ConstellationBackground />
        <ToolsAIChat context={{
          accent: ACCENT,
          tool: "Text-to-SQL Agent",
          summary: "AI agent that converts natural language questions to SQL, executes them, and explains results.",
          guide: TEXT_TO_SQL_GUIDE,
          suggestions: TEXT_TO_SQL_SUGGESTIONS,
        }} />

        <div role="main" className="relative z-10 flex flex-col gap-6 pt-6">
          {/* Header */}
          <div className="max-w-7xl mx-auto px-4 w-full">
            <button onClick={handleBack}
              className="flex items-center gap-2 text-sm text-[var(--text2)] hover:text-[var(--text)] mb-4 py-1 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {toolBackLabel("text-to-sql")}
            </button>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}20` }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="3" rx="1" stroke={ACCENT} strokeWidth="1.4" />
                  <rect x="2" y="8" width="9" height="3" rx="1" stroke={ACCENT} strokeWidth="1.4" />
                  <path d="M13 10l2 2-2 2" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11 12h4" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Text-to-SQL Agent</h1>
                <p className="text-xs text-[var(--text2)]">Natural language → SQL → results → explanation</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <ThemeToggle />
              </div>
            </div>
          </div>

          <TextToSqlRunner />
        </div>
      </div>
    </PipelineProvider>
  );
}