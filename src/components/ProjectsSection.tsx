"use client";

import PlatformTile, { type Platform } from "./PlatformTile";
import registry from "@/data/registry.json";
import capabilities from "@/data/capabilities";

/**
 * The deployed platforms — full apps, shown in the same bento-tile style as the
 * toolkit's area grid below (see DomainSections). One definition of what a tile
 * looks like on this page: `.dom-card`/`.dom-grid` from 07-tools.css, reused
 * here so platforms and areas read as one system.
 *
 * The first platform gets the 2x2 tile, the rest the small ones — big + four
 * small fills a 4-column bento exactly for five platforms. Internal (native)
 * platforms navigate in-app; external HF-Space apps open in a new tab.
 */
const platforms = registry as Platform[];
const nativeCount = platforms.filter((p) => p.internal).length;
const hostedCount = platforms.length - nativeCount;

export default function ProjectsSection() {
  return (
    <section id="projects">
      <div className="section">
        <div style={{ marginBottom: "2rem" }}>
          <p className="section-label">Deployed Platforms</p>
          <h2 className="section-heading" style={{ marginBottom: 0 }}>
            {platforms.length} full platforms —{" "}
            <span className="heading-accent">enter and use</span>
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginTop: "0.75rem" }}>
            Complete, full-stack apps you can use end to end. For the{" "}
            {capabilities.length} single-purpose tools that sit alongside them, see{" "}
            <a href="#capabilities" style={{ color: "var(--link)", textDecoration: "none", fontWeight: 600 }}>
              the toolkit
            </a>{" "}
            below.
          </p>
        </div>

        <p className="cap-live" role="status">
          {platforms.length} platforms · {hostedCount} hosted apps + {nativeCount} native
        </p>

        <div className="dom-grid">
          {platforms.map((p, i) => (
            <PlatformTile key={p.id} platform={p} size={i === 0 ? "big" : "sm"} />
          ))}
        </div>

        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text3)",
            marginTop: "1.5rem",
            textAlign: "center",
          }}
        >
          {/* The three model apps run on a free Hugging Face Space; the native
              platforms (Testwright, Text-to-SQL) are part of this site. */}
          The hosted model apps run on a free Hugging Face Space — if it has gone idle, the first
          load takes a few seconds to wake up. The native platforms are part of this site.
        </p>
      </div>
    </section>
  );
}
