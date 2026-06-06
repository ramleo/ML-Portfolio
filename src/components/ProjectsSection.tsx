"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import registry from "@/data/registry.json";

type Project = typeof registry[0];

function ProjectListItem({
  project,
  active,
  onClick,
}: {
  project: Project;
  active: boolean;
  onClick: () => void;
}) {
  const { title, task, metric, metricLabel, accent } = project;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.85rem 1rem",
        borderRadius: 12,
        background: active ? `${accent}15` : "transparent",
        border: `1px solid ${active ? accent + "44" : "transparent"}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar when active */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: accent,
            borderRadius: "12px 0 0 12px",
          }}
        />
      )}

      {/* Status dot */}
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: accent,
          boxShadow: active ? `0 0 8px ${accent}` : "none",
          flexShrink: 0,
          marginLeft: active ? 6 : 2,
          transition: "margin-left 0.2s, box-shadow 0.2s",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.83rem",
            fontWeight: 700,
            color: active ? "var(--text)" : "var(--text2)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.2s",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: 2 }}>
          {task}
        </div>
      </div>

      {/* Metric badge */}
      <div
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: accent,
          background: `${accent}18`,
          padding: "2px 8px",
          borderRadius: 9999,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {metric} {metricLabel}
      </div>
    </button>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  const {
    title,
    description,
    model,
    task,
    dataset,
    metric,
    metricLabel,
    features,
    tags,
    url,
    github,
    accent,
  } = project;

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, x: 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      style={{ height: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 3,
          background: accent,
          borderRadius: 9999,
          width: "3rem",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              borderRadius: 9999,
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: `${accent}22`,
              color: accent,
              border: `1px solid ${accent}44`,
              marginBottom: "0.6rem",
            }}
          >
            {task}
          </span>
          <h3
            style={{
              fontSize: "clamp(1.25rem, 2.5vw, 1.7rem)",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
        </div>

        {/* Metric pill */}
        <div
          style={{
            textAlign: "center",
            padding: "0.75rem 1.25rem",
            borderRadius: 14,
            background: `${accent}18`,
            border: `1px solid ${accent}33`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: accent, lineHeight: 1 }}>
            {metric}
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginTop: 4 }}>
            {metricLabel}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--text2)",
          lineHeight: 1.8,
          margin: 0,
        }}
      >
        {description}
      </p>

      {/* Meta cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.6rem",
        }}
      >
        {[
          { label: "Model", value: model },
          { label: "Features", value: String(features) },
          { label: "Dataset", value: dataset },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "0.6rem 0.85rem",
            }}
          >
            <div
              style={{
                fontSize: "0.58rem",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 4,
              }}
            >
              {m.label}
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "auto", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            const theme = document.documentElement.classList.contains("light")
              ? "light"
              : "dark";
            const sep = url.includes("?") ? "&" : "?";
            window.open(`${url}${sep}theme=${theme}`, "_blank");
          }}
          style={{
            padding: "0.7rem 1.75rem",
            borderRadius: 9999,
            background: accent,
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.88rem",
            border: "none",
            cursor: "pointer",
            transition: "opacity 0.15s, transform 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.88";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Launch App
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <a
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.7rem 1.5rem",
            borderRadius: 9999,
            border: "1px solid var(--border2)",
            background: "var(--border)",
            color: "var(--text2)",
            fontWeight: 600,
            fontSize: "0.88rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--text3)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border2)";
            e.currentTarget.style.color = "var(--text2)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>
    </motion.div>
  );
}

export default function ProjectsSection() {
  const [selected, setSelected] = useState<Project>(registry[0]);

  return (
    <section id="projects" style={{ background: "var(--bg-section)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section">

        {/* Header */}
        <p className="section-label">Projects</p>
        <h2 className="section-heading">
          Live ML Apps —{" "}
          <span className="gradient-text">click to predict</span>
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text3)",
            maxWidth: 540,
            marginBottom: "3rem",
          }}
        >
          Select a project from the list — all apps are live and interactive.
        </p>

        {/* Two-panel container */}
        <div
          className="projects-panel"
          style={{
            background: "var(--bg-glass)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid var(--border2)",
            borderRadius: 20,
            overflow: "hidden",
            minHeight: 420,
          }}
        >
          {/* Left — project list */}
          <div
            className="projects-panel-left"
            style={{
              padding: "1.25rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <p
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text3)",
                padding: "0 0.25rem",
                marginBottom: "0.6rem",
              }}
            >
              All Projects
            </p>
            {registry.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                active={selected.id === project.id}
                onClick={() => setSelected(project)}
              />
            ))}
          </div>

          {/* Right — detail panel */}
          <div style={{ padding: "2rem", overflow: "hidden" }}>
            <AnimatePresence mode="wait">
              <ProjectDetail key={selected.id} project={selected} />
            </AnimatePresence>
          </div>
        </div>

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
      </div>
    </section>
  );
}
