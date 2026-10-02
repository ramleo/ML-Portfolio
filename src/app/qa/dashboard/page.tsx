"use client";

import Link from "next/link";
import { useToolTracking } from "@/hooks/useAnalytics";
import RunDashboard from "./RunDashboard";

const ACCENT = "#14b8a6";

export default function DashboardPage() {
  useToolTracking("qa-dashboard");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
            <path d="M3 3v18h18M8 17V9M13 17V5M18 17v-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
            Trends across your recent Testwright runs — pass rate, top failing tests and flakiness (from this browser)
          </p>
        </div>
        <Link href="/qa/run"
          className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors shrink-0"
          style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
          ← Back to Run
        </Link>
      </div>

      <RunDashboard accent={ACCENT} />
    </div>
  );
}
