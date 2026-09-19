"use client";

import { useEffect, useRef, useState } from "react";
import GuideContent, { ACCENT } from "./guideContent";

interface Props { onClose: () => void; }

export default function UserGuideModal({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Filter guide sections by text. Runs against the rendered DOM so it works
  // regardless of how each section's JSX is structured.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const q = query.trim().toLowerCase();
    const sections = root.querySelectorAll<HTMLElement>("[data-guide-section]");
    if (!q) {
      sections.forEach((el) => { el.hidden = false; });
      setMatches(null);
      root.scrollTop = 0;
      return;
    }
    let hits = 0;
    sections.forEach((el) => {
      const hay = (el.getAttribute("data-title") + " " + (el.textContent || "")).toLowerCase();
      const hit = hay.includes(q);
      el.hidden = !hit;
      if (hit) hits++;
    });
    setMatches(hits);
    root.scrollTop = 0;
  }, [query]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0"
          style={{ background: "var(--bg-card)" }}>
          <div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" stroke={ACCENT} strokeWidth="1.3"/>
                <path d="M8 11V7.5M8 5.5v-.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <h1 className="text-[15px] font-bold text-[var(--text)]">Text-to-SQL User Guide</h1>
            </div>
            <p className="text-[11px] text-[var(--text3)] mt-0.5 ml-6">Everything you need to query data with natural language</p>
          </div>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-[rgba(var(--fg-rgb),0.08)] transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[var(--border)] shrink-0" style={{ background: "var(--bg-card)" }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-[var(--border)]"
            style={{ background: "rgba(var(--fg-rgb),0.03)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[var(--text3)]">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              id="guide-search"
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the guide — e.g. filter, correction, shortcut…"
              className="flex-1 bg-transparent outline-none text-[12px] text-[var(--text)] placeholder:text-[var(--text3)]"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[var(--text3)] hover:text-[var(--text)] shrink-0" aria-label="Clear search">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
          {matches !== null && (
            <p className="text-[10px] text-[var(--text3)] mt-1.5 ml-1">
              {matches === 0 ? "No sections match — try another word." : `${matches} section${matches === 1 ? "" : "s"} match “${query.trim()}”`}
            </p>
          )}
        </div>

        {/* Content — the scroll container */}
        <div ref={scrollRef} className="guide-scroll flex-1 overflow-y-auto px-6 py-6">
          <GuideContent />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] flex items-center justify-between shrink-0"
          style={{ background: "var(--bg)" }}>
          <span className="text-[10px] text-[var(--text3)]">Text-to-SQL Agent — ML Portfolio</span>
          <button onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            Got it
          </button>
        </div>
      </div>

      {/* Always-visible scrollbar for the content area (macOS hides overlay
          scrollbars by default). */}
      <style>{`
        .guide-scroll { scrollbar-width: thin; scrollbar-color: ${ACCENT} transparent; scrollbar-gutter: stable; }
        .guide-scroll::-webkit-scrollbar { width: 10px; }
        .guide-scroll::-webkit-scrollbar-track { background: rgba(var(--fg-rgb),0.04); border-radius: 8px; }
        .guide-scroll::-webkit-scrollbar-thumb { background: ${ACCENT}; border-radius: 8px; border: 2px solid var(--bg-card); }
        .guide-scroll::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
      `}</style>
    </div>
  );
}
