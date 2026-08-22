"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import AnalyticsContent from "./AnalyticsContent";

export default function RagAnalyticsPage() {
  useToolTracking("rag-analytics");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/tools/multimodal-rag"), [router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>RAG Usage Analytics</h1>
          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
}