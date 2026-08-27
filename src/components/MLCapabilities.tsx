"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import capabilities, { type Capability } from "@/data/capabilities";
import { ML_UNIFIED_API } from "@/config/urls";

const DOMAIN_ORDER = ["ML Pipeline", "Language & Documents", "Computer Vision", "Security & Trust"];
const DOMAIN_COLOR: Record<string, string> = {
  "ML Pipeline": "#34d399",
  "Language & Documents": "#6366f1",
  "Computer Vision": "#38bdf8",
  "Security & Trust": "#f43f5e",
};

// Strict glyph-letter match: a query only matches a card whose NAME starts with it —
// matching anywhere in the name/description/tags let a single common letter light up
// nearly every card, which defeated the point of a name-first filter (tested live).
function matches(cap: Capability, query: string): boolean {
  if (!query) return true;
  return cap.title.toLowerCase().startsWith(query);
}

// ── Single card — glyph + name at rest, flips on hover to show the real detail
// panel (description, stat, tags, and the actual Try it/Launch + GitHub actions) ──
function FlipCard({ cap, onRunHere }: { cap: Capability; onRunHere?: () => void }) {
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

  return (
    <div
      className={`flip-outer${expanded ? " expanded" : ""}`}
      onClick={handleNavigate}
      onMouseLeave={() => setExpanded(false)}
      title={`Hover to flip, click to open ${cap.title}`}
      style={{ ["--acc-glow" as string]: `${cap.accent}14` }}
    >
      <div className="flip-inner">
        <div className="flip-face front">
          <div className="flip-front-body">
            <div className="glyph" style={{ background: `${cap.accent}14`, color: cap.accent }}>
              <cap.icon size={17} strokeWidth={2} />
            </div>
            <div className="txt">
              <h3>{cap.title}</h3>
              <span className="sub">{cap.subtitle}</span>
            </div>
          </div>
        </div>

        <div className="flip-face back" style={{ borderColor: `${cap.accent}33` }}>
          <div className="flip-back-body">
            <span className="badge" style={{ background: `${cap.accent}22`, color: cap.accent, border: `1px solid ${cap.accent}44` }}>
              {cap.subtitle}
            </span>
            <h3>{cap.title}</h3>
            <p ref={descRef} className={`desc${expanded ? " expanded" : ""}`}>{cap.description}</p>
            {needsToggle && (
              <button
                className="see-more-btn"
                style={{ color: cap.accent }}
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              >
                {expanded ? "See less" : "See more"}
              </button>
            )}
            <div className="stat-row">
              <span className="stat" style={{ color: cap.accent }}>{cap.stat}</span>
              <span className="stat-label">{cap.statLabel}</span>
            </div>
            <div className="tags">
              {cap.tags.slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="back-actions" onClick={(e) => e.stopPropagation()}>
              <button onClick={handleNavigate} className="try-btn" style={{ background: cap.accent }}>
                {cap.internalLink || cap.modalEnabled ? "Try it" : "Launch App"}
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <a href={cap.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="gh-btn">
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

// ── Section ───────────────────────────────────────────────────────────────────
// Self-contained: import this anywhere, pass no props. Card data lives in
// src/data/capabilities.ts. Tools are grouped into domains and searchable by
// name; every card flips on hover to reveal its detail panel and real actions.
export default function MLCapabilities() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("all");
  const searchBarRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  const domains = useMemo(
    () => DOMAIN_ORDER.filter((d) => capabilities.some((c) => c.domain === d)),
    []
  );

  const visibleCount = useMemo(
    () => capabilities.filter((c) => matches(c, query.trim().toLowerCase())).length,
    [query]
  );

  // Filtering can collapse whole domain sections (zero matches), shrinking
  // the page enough that the actual results end up scrolled out of view —
  // either above the viewport (search bar pushed past top: 0) or, if the
  // user was scrolled deep into a domain that just collapsed, entirely
  // below it (the whole section's remaining content sits above where the
  // user is now). Earlier versions of this fix checked proxies for
  // visibility (the search bar's own position, or the section wrapper's
  // bottom edge) — both had real gaps: a proxy can read as "close enough"
  // while the actual result cards, nested further in, are still mostly or
  // fully off-screen. Check the actual results content directly instead.
  // Scrolls the plain (non-sticky) section container rather than the sticky
  // search bar itself — scrollIntoView on a position:sticky element is
  // unreliable, since the browser's scroll-target calculation and the
  // element's own sticky recalculation can disagree mid-scroll. Also
  // deliberately "instant", not "smooth": fast typing re-fires this effect
  // on every keystroke, and a still-animating smooth scroll from the
  // previous keystroke makes the next keystroke's check read a stale,
  // mid-animation position.
  useEffect(() => {
    // Skip on mount: this effect's dependencies also fire on first render,
    // when the section is legitimately below the fold (unscrolled page load)
    // — that's not "results scrolled out of view by filtering", it's just
    // where the section normally lives, and correcting for it forces an
    // unwanted auto-scroll down on every page load/refresh.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const section = sectionRef.current;
    const results = resultsRef.current;
    if (!section || !results) return;
    const items = Array.from(results.querySelectorAll(".cap-grid, .cap-no-results"));
    // A single visible pixel technically counts as "in the viewport" but
    // isn't usably visible — require a real, legible amount of the element
    // showing (or all of it, if it's naturally shorter than that).
    const MIN_VISIBLE_PX = 120;
    const anyResultVisible = items.some((el) => {
      const r = el.getBoundingClientRect();
      const visibleHeight = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return visibleHeight >= Math.min(MIN_VISIBLE_PX, r.height);
    });
    if (items.length > 0 && !anyResultVisible) {
      section.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [query, activeDomain]);

  return (
    <section id="capabilities" ref={sectionRef} style={{ padding: "5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
          ML Capabilities
        </p>
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0 }}>
          What powers every <span className="gradient-text">prediction</span>
        </h2>
      </div>

      <div className="cap-search-bar" ref={searchBarRef}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${capabilities.length} tools by name — try "P", "Feature", or "SHAP"…`}
        />
        <span className="cap-count">{visibleCount} of {capabilities.length} tools</span>
      </div>

      <div className="cap-tag-bar">
        <button
          className={`cap-rtag${activeDomain === "all" ? " active" : ""}`}
          onClick={() => setActiveDomain("all")}
        >
          All {capabilities.length} tools
        </button>
        {domains.map((d) => (
          <button
            key={d}
            className={`cap-rtag${activeDomain === d ? " active" : ""}`}
            onClick={() => setActiveDomain(d)}
          >
            <span className="cap-dot" style={{ background: DOMAIN_COLOR[d] }} />
            {d}
          </button>
        ))}
      </div>

      <div ref={resultsRef}>
        {domains.map((d) => {
          if (activeDomain !== "all" && activeDomain !== d) return null;
          const q = query.trim().toLowerCase();
          const items = capabilities
            .filter((c) => c.domain === d && matches(c, q))
            .sort((a, b) => a.title.localeCompare(b.title));
          if (items.length === 0) return null;
          const total = capabilities.filter((c) => c.domain === d).length;
          return (
            <div key={d} style={{ marginBottom: "3rem" }}>
              <div className="cap-cluster-head">
                <span className="cap-dot" style={{ width: 8, height: 8, background: DOMAIN_COLOR[d] }} />
                <h4>{d}</h4>
                <span className="cap-cluster-count">{total} tools</span>
                <div className="cap-cluster-line" />
              </div>
              <div className="cap-grid">
                {items.map((cap) => (
                  <FlipCard
                    key={cap.id}
                    cap={cap}
                    onRunHere={cap.modalEnabled ? () => router.push(`/tools/${cap.id}`) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {visibleCount === 0 && (
          <p className="cap-no-results" style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text3)", fontSize: "0.85rem" }}>
            No tools match &ldquo;{query}&rdquo;. Try a different search or clear the filter.
          </p>
        )}
      </div>
    </section>
  );
}
