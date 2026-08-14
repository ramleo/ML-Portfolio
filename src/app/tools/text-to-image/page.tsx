"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import TextToImageRunner from "./TextToImageRunner";
import { STYLE_OPTIONS, ASPECT_RATIO_OPTIONS } from "./useTextToImageRunner";

const ACCENT = "#ec4899";

// Built from the same STYLE_OPTIONS/ASPECT_RATIO_OPTIONS the UI renders —
// one source of truth, so the chat's grounding can never drift out of sync
// with what's actually on the page (a hardcoded prose description would).
// Without a `guide` prop, ToolsAIChat/useRagChat sends exactly
// `Tool: <tool>\n<summary>` as the LLM's only context for this tool (see
// buildToolContext in useRagChat.ts) — a one-line summary with no mention
// of these controls left the assistant unable to answer questions about
// them accurately.
const TOOL_SUMMARY =
  "Type a description and get a generated image back — no input photo required, just a prompt. " +
  `Optional Style presets (pick one, or none): ${STYLE_OPTIONS.map(s => s.label).join(", ")} — each ` +
  "appends a style phrase to the prompt before generation, e.g. \"Anime\" makes the result look like " +
  "vibrant anime/manga art. " +
  `Optional Aspect ratio (pick one, or none): ${ASPECT_RATIO_OPTIONS.map(a => a.label).join(", ")} — ` +
  "composes the image for that shape (Square = 1:1, Landscape = 16:9 widescreen, Portrait = 9:16 tall). " +
  "Optional \"Avoid\" field (free text, e.g. \"blurry, text, watermark\") tells the model what NOT to " +
  "include in the image — a negative prompt. All three are folded into the same single generation " +
  "call, so picking them costs nothing extra beyond one normal generation. " +
  "Uses Gemini's paid image model, so a small daily generation budget applies (resets at UTC midnight).";

export default function TextToImagePage() {
  useToolTracking("text-to-image");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ color: "var(--text)" }}>
      <ConstellationBackground />
      <ToolsAIChat context={{
        accent: ACCENT,
        tool: "Text-to-Image Generator",
        summary: TOOL_SUMMARY,
        suggestions: [
          "How do style presets change the generated image?",
          "What's the difference between aspect ratio options?",
          "How does the daily generation budget work?",
        ],
      }} />

      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4 w-full">
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

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16M14 14l1.5-1.5a2 2 0 012.8 0L21 15M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                  stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke={ACCENT} strokeWidth="1.5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Text-to-Image Generator</h1>
                <span className="text-[9px] px-2 py-[3px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                  Describe It, Generate It
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                Type a prompt, get a generated image back — no input photo needed
              </p>
            </div>
          </div>

          <TextToImageRunner accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
