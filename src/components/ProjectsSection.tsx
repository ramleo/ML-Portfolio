"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "./ProjectCard";
import registry from "@/data/registry.json";
import capabilities from "@/data/capabilities";

const ALL = "All";
const uniqueTags = [ALL, ...Array.from(new Set(registry.flatMap((p) => p.tags)))];

export default function ProjectsSection() {
  const [activeTag, setActiveTag] = useState(ALL);

  const filtered = activeTag === ALL
    ? registry
    : registry.filter((p) => p.tags.includes(activeTag));

  return (
    // This section hand-rolled its own container, label and heading styles
    // instead of using the shared .section / .section-label / .section-heading
    // classes every other section uses. That produced two type scales on one
    // page (40px here vs 44px elsewhere) and two vertical rhythms (80px of
    // section padding vs 96px). Now on the shared classes.
    <section id="projects">
      <div className="section">

      {/* Section header */}
      <div style={{ marginBottom: "2rem" }}>
        <p className="section-label">
          Deployed Platforms
        </p>
        <h2 className="section-heading" style={{ marginBottom: 0 }}>
          Three full apps —{" "}
          <span className="heading-accent">click to predict</span>
        </h2>
        {/* This section and the tool grid below it are different things — full
            multi-model applications here, single-purpose tools there — but
            nothing on the page said so, leaving two similar-looking card
            sections back to back with no stated relationship. */}
        <p style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginTop: "0.75rem" }}>
          Complete, multi-model platforms you can use end to end. For the {" "}
          {capabilities.length} single-purpose tools that sit alongside them, see{" "}
          <a href="#capabilities" style={{ color: "var(--link)", textDecoration: "none", fontWeight: 600 }}>
            the toolkit
          </a>{" "}
          below.
        </p>
      </div>

      {/* Tag filter — #18 AnimatePresence on filter chips */}
      <div
        style={{
          display: "flex",
          gap: "0.45rem",
          flexWrap: "wrap",
          marginBottom: "2rem",
          overflowX: "auto",
          paddingBottom: "0.25rem",
        }}
      >
        {uniqueTags.map((tag) => {
          const active = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                padding: "0.28rem 0.9rem",
                borderRadius: 9999,
                fontSize: "0.72rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                border: `1px solid ${active ? "var(--text)" : "var(--border2)"}`,
                background: active ? "var(--text)" : "transparent",
                color: active ? "var(--bg)" : "var(--text3)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Grid with stagger entrance (#15) and AnimatePresence (#18) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
          gap: "1.25rem",
          // "stretch" so every card in a row matches the tallest — descriptions
          // are now clamped to a fixed number of lines with a "See more" toggle,
          // so equal-height cards no longer produce dead space.
          alignItems: "stretch",
        }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: 28 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.38, delay: i * 0.09, ease: "easeOut" },
              }}
              exit={{
                opacity: 0,
                scale: 0.94,
                transition: { duration: 0.2 },
              }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--text3)",
          marginTop: "1.5rem",
          textAlign: "center",
        }}
      >
        {/* Named the wrong provider: every entry in registry.json points at
            wram1708-ml-unified.hf.space, not Render. The cold-start caveat is
            still real (a free Space sleeps when idle), so it stays — the
            specific "~15s" figure was dropped as it was never measured. */}
        All three run on a free Hugging Face Space — if it has gone idle, the first load
        takes a few seconds to wake up.
      </p>
      </div>
    </section>
  );
}
