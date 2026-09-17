"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import capabilities from "@/data/capabilities";
import type { Domain } from "@/data/domains";
import ToolCard from "./ToolCard";
import { scoreCapability, deriveFilterTags, hasTag } from "@/lib/toolSearch";
import { useSearchTracking, trackSearchResultClick } from "@/lib/useSearchTracking";

/**
 * One domain's tools, with search and tag facets scoped to that domain.
 *
 * The domain buttons that used to sit on the home page are gone — the URL is
 * the domain filter now, which means the choice is linkable, bookmarkable and
 * survives the Back button, none of which was true of the old in-page state.
 * The tag facets stay in-page: they are a second axis (where a tool runs, what
 * powers it) that cuts across domains, and they are derived from this domain's
 * own tools, so a page never offers a filter that would empty it.
 */
export default function DomainToolGrid({ domain }: { domain: Domain }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Arriving from the home page, focus is left on the <body> after the client
  // navigation, so a keyboard or screen-reader user starts from the top of the
  // chrome again rather than at the content they asked for.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const all = useMemo(
    () => capabilities.filter((c) => c.domain === domain.name),
    [domain.name]
  );

  const filterTags = useMemo(() => deriveFilterTags(all, [domain.name]), [all, domain.name]);

  const items = useMemo(
    () =>
      all
        .map((cap) => ({ cap, score: scoreCapability(cap, query) }))
        .filter(({ cap, score }) => score > 0 && (!activeTag || hasTag(cap, activeTag)))
        .sort((a, b) => b.score - a.score || a.cap.title.localeCompare(b.cap.title))
        .map(({ cap }) => cap),
    [all, query, activeTag]
  );

  useSearchTracking(`tools:${domain.name}`, query, items.length);

  return (
    <section className="section" style={{ ["--dom" as string]: domain.color, ["--dom-l" as string]: domain.colorLight }}>
      <Link href="/#capabilities" className="dom-back">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M10 6H2M5.5 2.5 2 6l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All areas
      </Link>

      <div style={{ marginBottom: "2rem" }}>
        <p className="section-label" style={{ color: domain.color }}>
          {all.length} {all.length === 1 ? "tool" : "tools"}
        </p>
        <h1 className="section-heading" ref={headingRef} tabIndex={-1} style={{ marginBottom: 0 }}>
          {domain.name}
        </h1>
        {domain.blurb && (
          <p style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 620, marginTop: "0.75rem" }}>
            {domain.blurb}
          </p>
        )}
      </div>

      <div className="cap-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${domain.name} tools`}
          placeholder={`Search ${all.length} ${domain.name} tools…`}
        />
        {query && (
          <button className="cap-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

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

      <p className="cap-live" role="status" aria-live="polite">
        Showing {items.length} of {all.length}
      </p>

      {items.length > 0 ? (
        <div className="cap-grid">
          {items.map((cap, i) => (
            <ToolCard
              key={cap.id}
              cap={cap}
              onRunHere={cap.modalEnabled ? () => {
                if (query.trim()) trackSearchResultClick(`tools:${domain.name}`, i, cap.id, query.trim().length);
                router.push(`/tools/${cap.id}`);
              } : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="cap-no-results">
          No {domain.name} tools match{query.trim() ? ` “${query.trim()}”` : ""}
          {activeTag ? ` in ${activeTag}` : ""}. Clear the filters, or{" "}
          <Link href="/#capabilities" style={{ color: "var(--link)" }}>search every area</Link>.
        </p>
      )}
    </section>
  );
}
