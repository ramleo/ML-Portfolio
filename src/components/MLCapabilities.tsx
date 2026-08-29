"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import capabilities from "@/data/capabilities";
import ToolCard from "./ToolCard";
import { scoreCapability, deriveFilterTags, hasTag } from "@/lib/toolSearch";

const DOMAIN_ORDER = ["ML Pipeline", "Language & Documents", "Computer Vision", "Security & Trust"];
const DOMAIN_COLOR: Record<string, string> = {
  "ML Pipeline": "#34d399",
  "Language & Documents": "#6366f1",
  "Computer Vision": "#38bdf8",
  "Security & Trust": "#f43f5e",
};

// ── Section ───────────────────────────────────────────────────────────────────
// Self-contained: import this anywhere, pass no props. Card data lives in
// src/data/capabilities.ts, the card itself in ToolCard.tsx, and the matching
// and faceting rules in lib/toolSearch.ts. Tools are grouped into domains and
// filterable three ways — free-text search, domain, and a cross-cutting tag —
// which combine rather than override each other.
export default function MLCapabilities() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  const domains = useMemo(
    () => DOMAIN_ORDER.filter((d) => capabilities.some((c) => c.domain === d)),
    []
  );

  const filterTags = useMemo(() => deriveFilterTags(capabilities, domains), [domains]);

  // Every filter in one place, so the count in the search bar and the cards on
  // screen can never disagree. The old count ignored the domain buttons and
  // read "50 of 50 tools" while a single domain was showing.
  const matching = useMemo(() => {
    const q = query.trim();
    return capabilities
      .map((cap) => ({ cap, score: scoreCapability(cap, q) }))
      .filter(({ cap, score }) => score > 0 && (!activeTag || hasTag(cap, activeTag)));
  }, [query, activeTag]);

  const visibleCount = useMemo(
    () => matching.filter(({ cap }) => activeDomain === "all" || cap.domain === activeDomain).length,
    [matching, activeDomain]
  );

  // A visitor skimming for well under a minute previously met 50 equally
  // weighted cards and no signal about where to start. These few lead, with
  // the full grid unchanged below. Shown only in the unfiltered view — once
  // someone is searching or has narrowed down they've stated their intent,
  // and a fixed row on top would just be in the way.
  const featured = useMemo(
    () =>
      capabilities
        .filter((c) => typeof c.featured === "number")
        .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0)),
    []
  );
  const showFeatured = featured.length > 0 && !query.trim() && activeDomain === "all" && !activeTag;

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
  }, [query, activeDomain, activeTag]);

  return (
    // Was hand-rolling its own container/label/heading styles rather than the
    // shared .section classes, which gave the page two heading scales (40px
    // here vs 44px elsewhere) and two section rhythms (80px vs 96px padding).
    <section id="capabilities" ref={sectionRef}>
      <div className="section">
      <div style={{ marginBottom: "2rem" }}>
        <p className="section-label">
          The Toolkit
        </p>
        <h2 className="section-heading" style={{ marginBottom: 0 }}>
          {capabilities.length} tools, each{" "}
          <span className="heading-accent">live and testable</span>
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginTop: "0.75rem" }}>
          Single-purpose tools, each backed by a real model or algorithm — separate from the{" "}
          <a href="#projects" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            three full platforms
          </a>{" "}
          above. Start with the featured few, or search all {capabilities.length}.
        </p>
      </div>

      <div className="cap-search-bar" ref={searchBarRef}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tools"
          placeholder={`Search ${capabilities.length} tools — try "malware", "PDF" or "SHAP"…`}
        />
        {query && (
          <button className="cap-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
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

      {/* Cross-cutting facets, derived from the tags already on each tool. The
          domain row above answers "what kind of thing is this"; this one
          answers "where does it run and what powers it", which the domains
          cannot express — several of the browser-only tools sit in different
          domains. Single-select on purpose: ANDing two long-tail tags empties
          the grid almost immediately. */}
      {filterTags.length > 0 && (
        <div className="cap-facet-bar">
          <span className="cap-facet-label">Filter</span>
          {filterTags.map((tag) => (
            <button
              key={tag}
              className={`cap-facet${activeTag === tag ? " active" : ""}`}
              aria-pressed={activeTag === tag}
              onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
            >
              {tag}
            </button>
          ))}
          {activeTag && (
            <button className="cap-facet-clear" onClick={() => setActiveTag(null)}>
              Clear
            </button>
          )}
        </div>
      )}

      {showFeatured && (
        <div style={{ marginBottom: "3.5rem" }}>
          <div className="cap-cluster-head">
            <span className="cap-dot" style={{ width: 8, height: 8, background: "var(--accent)" }} />
            <h4>Featured work</h4>
            <span className="cap-cluster-count">Start here</span>
            <div className="cap-cluster-line" />
          </div>
          <div className="cap-grid">
            {featured.map((cap) => (
              <ToolCard
                key={`featured-${cap.id}`}
                cap={cap}
                onRunHere={cap.modalEnabled ? () => router.push(`/tools/${cap.id}`) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={resultsRef}>
        {domains.map((d) => {
          if (activeDomain !== "all" && activeDomain !== d) return null;
          // Most relevant first while searching; alphabetical at rest, where
          // every card scores the same and a stable order is easier to scan.
          const items = matching
            .filter(({ cap }) => cap.domain === d)
            .sort((a, b) => b.score - a.score || a.cap.title.localeCompare(b.cap.title))
            .map(({ cap }) => cap);
          if (items.length === 0) return null;
          const total = capabilities.filter((c) => c.domain === d).length;
          return (
            <div key={d} style={{ marginBottom: "3rem" }}>
              <div className="cap-cluster-head">
                <span className="cap-dot" style={{ width: 8, height: 8, background: DOMAIN_COLOR[d] }} />
                <h4>{d}</h4>
                <span className="cap-cluster-count">
                  {items.length === total ? `${total} tools` : `${items.length} of ${total}`}
                </span>
                <div className="cap-cluster-line" />
              </div>
              <div className="cap-grid">
                {items.map((cap) => (
                  <ToolCard
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
            No tools match{query.trim() ? ` “${query}”` : ""}
            {activeTag ? ` in ${activeTag}` : ""}. Try a different search or clear the filters.
          </p>
        )}
      </div>
      </div>
    </section>
  );
}
