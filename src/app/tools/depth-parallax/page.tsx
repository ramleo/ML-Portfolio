"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import DepthParallaxRunner from "./DepthParallaxRunner";

const ACCENT = "#3b82f6";

const TOOL_SUMMARY =
  "Upload a single photo — a local ONNX model (Depth-Anything-V2-Small) estimates a per-pixel " +
  "depth map, then five ways to use it: Parallax (move your pointer, near objects shift more than " +
  "far ones), Depth map (the raw relative depth, brighter = nearer), Bokeh (click a point to keep it " +
  "sharp, everything else blurs by distance from that point, like phone portrait mode), AR occlusion " +
  "(click to place a marker, drag a depth slider — it hides behind anything in the photo that's " +
  "actually nearer, demonstrating what real AR placement has to solve), and 3D relief (drag to shift " +
  "the camera sideways over real displaced 3D geometry — near things move more than far things, a " +
  "deliberately limited range since a single photo only ever saw one side of everything). " +
  "Everything after the one upload runs locally in WebGL, no per-interaction API cost.";

export default function DepthParallaxPage() {
  useToolTracking("depth-parallax");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Depth Parallax",
        summary: TOOL_SUMMARY,
        suggestions: [
          "What does the depth map's brightness mean?",
          "Why does the AR marker disappear sometimes?",
          "What's the difference between Bokeh and 3D relief?",
        ],
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
                <path d="M12 2l9 5-9 5-9-5 9-5z" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12l9 5 9-5M3 17l9 5 9-5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Depth Parallax</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  One Photo, Instant 3D
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Estimates per-pixel depth from a single photo, then drives a live parallax diorama effect
              </p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <ThemeToggle />
            </div>
          </div>

          <DepthParallaxRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
