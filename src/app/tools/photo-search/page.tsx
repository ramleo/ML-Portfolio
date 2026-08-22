"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import PhotoSearchRunner from "./PhotoSearchRunner";
import PhotoSearchUserGuideModal from "./PhotoSearchUserGuideModal";
import { PHOTO_SEARCH_GUIDE, PHOTO_SEARCH_SUGGESTIONS } from "./userGuide";

const ACCENT = "#38bdf8";

const TOOL_SUMMARY =
  "Upload a batch of photos and describe what you're looking for in plain language ('the red backpack', " +
  "'a dog on a beach') — CLIP embeds every photo and the text query, then ranks photos by how well each " +
  "matches. No manual tagging, no persistent storage, everything runs in one request.";

export default function PhotoSearchPage() {
  useToolTracking("photo-search");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Photo Library Visual Search",
        summary: TOOL_SUMMARY,
        guide: PHOTO_SEARCH_GUIDE,
        suggestions: PHOTO_SEARCH_SUGGESTIONS,
      }} />

      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-6xl mx-auto px-4 w-full">
          <button onClick={handleBack}
            className="flex items-center gap-2 text-sm mb-4 transition-colors"
            style={{ color: "var(--text3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Home
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke={ACCENT} strokeWidth="1.5"/>
                <path d="M20 20l-4.35-4.35" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Photo Library Visual Search</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  CLIP · No API Cost
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Describe what you&apos;re looking for and find it across a batch of uploaded photos
              </p>
            </div>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5 shrink-0"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
            <ThemeToggle />
          </div>

          <PhotoSearchUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

          <PhotoSearchRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
