"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import capabilities from "@/data/capabilities";
import { allDomains, countFor, type Domain } from "@/data/domains";
import ToolCard from "./ToolCard";
import { scoreCapability } from "@/lib/toolSearch";

/**
 * The toolkit's home-page entry point: four groups, not fifty cards.
 *
 * The section used to render every tool inline, so the page grew by a row
 * every few tools added — the problem the hover-flip card was introduced to
 * hold off. Grouping solves it outright: the home page's height no longer
 * depends on the tool count at all, and each group gets its own page with room
 * to actually describe what is in it.
 *
 * Search stays here rather than moving to the group pages alone, because
 * "which of these fifty does what I want" is the one question the grouping
 * makes harder to answer. Typing shows matching tools directly, across every
 * group, so nothing is more than one interaction away.
 *
 * Keeps id="capabilities": forty-odd tool pages navigate back to
 * `/#capabilities`, and that link should keep landing here.
 */
function namesFor(domain: Domain): string[] {
  return capabilities.filter((c) => c.domain === domain.name).map((c) => c.title);
}

export default function DomainSections() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const domains = useMemo(() => allDomains(), []);
  const searching = query.trim().length > 0;

  /**
   * Tile size is derived from the tool count, not assigned by hand: the
   * largest area gets the 2x2 tile, the next the wide one, the rest the small
   * ones. An asymmetric grid whose proportions are hardcoded goes stale the
   * moment the counts shift — this one re-ranks itself, so adding tools to an
   * area is the only edit ever needed.
   */
  const sized = useMemo(() => {
    const ranked = domains
      .map((domain) => ({ domain, count: countFor(domain) }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count || a.domain.name.localeCompare(b.domain.name));
    return ranked.map((entry, i) => ({
      ...entry,
      size: i === 0 ? "big" : i === 1 ? "mid" : "sm",
    }));
  }, [domains]);

  const results = useMemo(() => {
    if (!searching) return [];
    return capabilities
      .map((cap) => ({ cap, score: scoreCapability(cap, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.cap.title.localeCompare(b.cap.title))
      .map(({ cap }) => cap);
  }, [query, searching]);

  return (
    <section id="capabilities">
      <div className="section">
        <div style={{ marginBottom: "2rem" }}>
          <p className="section-label">The Toolkit</p>
          <h2 className="section-heading" style={{ marginBottom: 0 }}>
            {capabilities.length} tools, each <span className="heading-accent">live and testable</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginTop: "0.75rem" }}>
            Single-purpose tools, each backed by a real model or algorithm — separate from the{" "}
            <a href="#projects" style={{ color: "var(--link)", textDecoration: "none", fontWeight: 600 }}>
              full platforms
            </a>{" "}
            above. Pick an area below, or search all {capabilities.length}.
          </p>
        </div>

        <div className="cap-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Search all ${capabilities.length} tools`}
            placeholder={`Search ${capabilities.length} tools — try "malware", "PDF" or "SHAP"…`}
          />
          {query && (
            <button className="cap-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* The result count was previously text only, so a screen-reader user
            got no signal that typing had changed anything. */}
        <p className="cap-live" role="status" aria-live="polite">
          {searching
            ? `${results.length} of ${capabilities.length} tools match ${query.trim()}`
            : `${domains.length} areas, ${capabilities.length} tools`}
        </p>

        {searching ? (
          results.length > 0 ? (
            <div className="cap-grid">
              {results.map((cap) => (
                <ToolCard
                  key={cap.id}
                  cap={cap}
                  onRunHere={cap.modalEnabled ? () => router.push(`/tools/${cap.id}`) : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="cap-no-results">
              No tools match “{query.trim()}”. Try a different word, or browse the areas below.
            </p>
          )
        ) : (
          <div className="dom-grid">
            {sized.map(({ domain: d, count, size }) => (
              <Link
                key={d.slug}
                href={`/tools/${d.slug}`}
                className={`dom-card subtle-card dom-${size}`}
                /* No --acc-glow: .subtle-card's radial is transparent unless a
                   caller supplies one, so these get the surface without the
                   hover glow. */
                style={{ ["--dom" as string]: d.color, ["--dom-l" as string]: d.colorLight }}
              >
                {/* The area's actual tool names, set small and faded, are the
                    tile's texture. It reads as weight rather than as a list —
                    twenty-one names look like twenty-one names — and it puts
                    real tool names on the home page, which is what a visitor
                    is scanning for. aria-hidden because it is texture: the
                    names are announced properly on the area's own page. */}
                <span className="dom-mosaic" aria-hidden="true">
                  {namesFor(d).map((t, i) => (
                    <i key={t} className={i % 3 === 2 ? "hi" : undefined}>{t}</i>
                  ))}
                </span>
                <span className="dom-cap">
                  <span className="dom-name">{d.name}</span>
                  <span className="dom-count">
                    {count} {count === 1 ? "tool" : "tools"}
                  </span>
                  {size === "big" && d.blurb && <span className="dom-blurb">{d.blurb}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
