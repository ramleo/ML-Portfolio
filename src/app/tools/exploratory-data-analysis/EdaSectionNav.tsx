"use client";
import { useEffect, useMemo, useState } from "react";
import type { EdaResult } from "./edaTypes";

/** Every section, and whether this particular dataset produced it. A nav
 *  entry that scrolls to an explanation of why a chart is absent is useful;
 *  one that scrolls to nothing at all is a broken link. */
function sections(result: EdaResult): { id: string; label: string }[] {
  const dup = result.duplicate_rows && result.duplicate_rows.rows.length > 0;
  return [
    { id: "overview", label: "Overview" },
    // Conditional entries mirror the conditions the sections themselves are
    // rendered under. A tab that scrolls to an element that was never
    // rendered is a dead link, and the two lists drifting apart is how that
    // happens — the analyst summary had no tab at all until this was fixed.
    ...(result.narrative ? [{ id: "summary", label: "Summary" }] : []),
    ...(result.insights.length ? [{ id: "insights", label: "Insights" }] : []),
    { id: "readiness", label: "Readiness" },
    { id: "suggestions", label: "AI suggestions" },
    { id: "sample", label: "First rows" },
    ...(dup ? [{ id: "duplicates", label: "Duplicates" }] : []),
    { id: "columns", label: "Columns" },
    ...(Object.keys(result.stats).length ? [{ id: "statistics", label: "Statistics" }] : []),
    { id: "distributions", label: "Distributions" },
    { id: "box-plots", label: "Spread" },
    { id: "mutual-information", label: "Mutual info" },
    { id: "splom", label: "Scatter matrix" },
    { id: "pca", label: "3D projection" },
    { id: "correlations", label: "Correlations" },
    { id: "clean", label: "Clean" },
    { id: "report", label: "Report" },
  ];
}

export default function EdaSectionNav({ result }: { result: EdaResult }) {
  // Memoised, or the effect below would tear down and rebuild the observer
  // on every render — a new array literal is never equal to the last one.
  const items = useMemo(() => sections(result), [result]);
  const [active, setActive] = useState(items[0].id);

  useEffect(() => {
    // rootMargin pulls the trigger line down past the two sticky bars, so the
    // highlighted entry is the section actually under the reader's eye rather
    // than the one hidden behind the header.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Report sections"
      data-wt="eda-nav"
      style={{
        position: "sticky", top: 60, zIndex: 40,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        // No negative margin to bleed the bar to the page edges: combined with
        // the container's own padding it made the nav wider than the viewport
        // on a phone, which is exactly the sideways scroll this page is meant
        // not to have.
        padding: "0.5rem 0",
        overflowX: "auto", minWidth: 0,
      }}
    >
      <div style={{ display: "flex", gap: "0.3rem", whiteSpace: "nowrap" }}>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              fontSize: "0.74rem", padding: "0.25rem 0.6rem", borderRadius: 9999,
              textDecoration: "none",
              color: active === item.id ? "var(--text)" : "var(--text3)",
              background: active === item.id ? "var(--border)" : "transparent",
              border: `1px solid ${active === item.id ? "var(--border2)" : "transparent"}`,
              transition: "color 0.15s, background 0.15s",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
