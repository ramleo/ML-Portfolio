"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "./ProjectCard";
import registry from "@/data/registry.json";

const ALL = "All";
const uniqueTags = [ALL, ...Array.from(new Set(registry.flatMap((p) => p.tags)))];

export default function ProjectsSection() {
  const [activeTag, setActiveTag] = useState(ALL);

  const filtered = activeTag === ALL
    ? registry
    : registry.filter((p) => p.tags.includes(activeTag));

  return (
    <section
      id="projects"
      style={{
        padding: "5rem 1.5rem",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >

      {/* Section header */}
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.5rem",
          }}
        >
          Projects
        </p>
        <h2
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Live ML Apps —{" "}
          <span className="gradient-text">click to predict</span>
        </h2>
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
        All projects are hosted on Render free tier — first load may take ~15s to spin up.
      </p>
    </section>
  );
}
