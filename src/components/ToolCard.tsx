"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Capability } from "@/data/capabilities";
import { ML_UNIFIED_API } from "@/config/urls";

/**
 * One tool card. Lifted out of MLCapabilities.tsx when the front face grew a
 * description and tag row — both files stay comfortably short this way.
 *
 * Two layouts from one piece of markup, chosen by `@media (hover: hover)` in
 * globals.css rather than by a JS breakpoint:
 *
 *   Pointer devices — the card is a compact glyph + name at rest and flips on
 *   hover to the detail panel (description, stat, tags, actions), as before.
 *
 *   Touch devices — there is no hover, so the flip never fired and a phone
 *   visitor saw only a name and a three-word badge on all 50 cards, with the
 *   description sitting behind `backface-visibility: hidden` and unreachable.
 *   The back face is hidden outright and the front carries the description and
 *   tags itself; tapping anywhere still opens the tool.
 *
 * The front-only elements are rendered always and hidden by CSS on desktop, so
 * there is no first-render/JS-width mismatch to get wrong.
 *
 * One consequence of two faces: both are in the accessibility tree even though
 * only one is ever visible, so every card used to be announced twice and the
 * whole grid's controls sat on a face a keyboard user could not see. The model
 * now is one card, two focus stops — the title button on the front (the
 * primary action) and the GitHub link on the back (the only thing that isn't a
 * duplicate). Everything else on the back repeats the front verbatim and is
 * marked aria-hidden with tabIndex -1, which keeps it clickable by mouse
 * without announcing or focusing it a second time.
 */
export default function ToolCard({ cap, onRunHere }: { cap: Capability; onRunHere?: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  // Only show "See more" for a card whose real (3-line-clamped) description
  // actually overflows — measured against the real rendered width, not a
  // guessed character count, so it stays correct at any grid column width.
  useEffect(() => {
    const check = () => {
      const el = descRef.current;
      if (el) setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleNavigate = () => {
    if (cap.internalLink) {
      router.push(cap.internalLink);
    } else if (cap.modalEnabled && onRunHere) {
      onRunHere();
    } else {
      const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
      let palette = "cosmic";
      try { palette = localStorage.getItem("palette") ?? "cosmic"; } catch {}
      const base = ML_UNIFIED_API + cap.link;
      const sep = base.includes("?") ? "&" : "?";
      window.open(`${base}${sep}theme=${theme}&palette=${palette}`, "_blank");
    }
  };

  const opensHere = Boolean(cap.internalLink || cap.modalEnabled);

  return (
    <div
      className={`flip-outer${expanded ? " expanded" : ""}`}
      onClick={handleNavigate}
      onMouseLeave={() => setExpanded(false)}
      title={`Open ${cap.title}`}
      style={{ ["--acc-glow" as string]: `${cap.accent}14` }}
    >
      <div className="flip-inner">
        <div className="flip-face front">
          <div className="flip-front-body">
            <div className="flip-front-head">
              <div className="glyph" style={{ background: `${cap.accent}14`, color: cap.accent }}>
                <cap.icon size={17} strokeWidth={2} />
              </div>
              <div className="txt">
                {/* The card's keyboard entry point. The wrapper div keeps its
                    click handler as a convenience for mouse users, so this
                    stops propagation rather than letting both fire — on an
                    external tool that would open two tabs. */}
                <h3>
                  <button
                    className="flip-title-btn"
                    onClick={(e) => { e.stopPropagation(); handleNavigate(); }}
                  >
                    {cap.title}
                  </button>
                </h3>
                <span className="sub">{cap.subtitle}</span>
              </div>
            </div>

            {/* Touch-only, hidden on pointer devices — see the note above. */}
            <p className="flip-front-desc">{cap.description}</p>
            <div className="flip-front-foot">
              <div className="tags">
                {cap.tags.slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
              <span className="flip-front-open" style={{ color: cap.accent }}>
                {opensHere ? "Open" : "Launch"}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="flip-face back" style={{ borderColor: `${cap.accent}33` }}>
          <div className="flip-back-body">
            <span className="badge" aria-hidden="true" style={{ background: `${cap.accent}22`, color: cap.accent, border: `1px solid ${cap.accent}44` }}>
              {cap.subtitle}
            </span>
            <h3 aria-hidden="true">{cap.title}</h3>
            <p ref={descRef} aria-hidden="true" className={`desc${expanded ? " expanded" : ""}`}>{cap.description}</p>
            {needsToggle && (
              <button
                className="see-more-btn"
                aria-hidden="true"
                tabIndex={-1}
                style={{ color: cap.accent }}
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              >
                {expanded ? "See less" : "See more"}
              </button>
            )}
            <div className="stat-row" aria-hidden="true">
              <span className="stat" style={{ color: cap.accent }}>{cap.stat}</span>
              <span className="stat-label">{cap.statLabel}</span>
            </div>
            <div className="tags" aria-hidden="true">
              {cap.tags.slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="back-actions" onClick={(e) => e.stopPropagation()}>
              <button onClick={handleNavigate} className="try-btn" aria-hidden="true" tabIndex={-1} style={{ background: cap.accent }}>
                {opensHere ? "Try it" : "Launch App"}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <a href={cap.github} target="_blank" rel="noopener noreferrer" aria-label={`Source code for ${cap.title} on GitHub`} className="gh-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
