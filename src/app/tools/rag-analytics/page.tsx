"use client";

import Link from "next/link";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
import AnalyticsContent from "./AnalyticsContent";

export default function RagAnalyticsPage() {
  useToolTracking("rag-analytics");

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
            <ThemeToggle />
          </div>
          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
}