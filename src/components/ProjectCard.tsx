"use client";

import { useState } from "react";

interface Project {
  id: string;
  title: string;
  description: string;
  model: string;
  task: string;
  dataset: string;
  metric: string;
  metricLabel: string;
  features: number;
  classes: number | null;
  tags: string[];
  url: string;
  github: string;
  accent: string;
}

export default function ProjectCard({ project }: { project: Project }) {
  const { title, description, model, task, dataset, metric, metricLabel, features, classes, tags, url, github, accent } = project;
  const isClassification = task === "Classification";

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -10, y: cx * 10 });
  };

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => {
    setHovering(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        background: "var(--bg-glass)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${hovering ? accent + "44" : "var(--border)"}`,
        transform: hovering
          ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: hovering
          ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
          : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
        boxShadow: hovering
          ? `0 0 0 1px ${accent}33, 0 20px 60px ${accent}22, 0 8px 24px rgba(0,0,0,0.35)`
          : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Shimmer overlay — follows tilt angle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background: hovering
            ? `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(255,255,255,0.07) 0%, transparent 65%)`
            : "none",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 0.08s ease",
        }}
      />

      {/* Colored top border */}
      <div style={{ height: 3, background: accent, flexShrink: 0, position: "relative", zIndex: 1 }} />

      <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem", position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 9999,
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: `${accent}22`,
                color: accent,
                border: `1px solid ${accent}44`,
                marginBottom: "0.5rem",
              }}
            >
              {task}
            </span>
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {title}
            </h3>
          </div>
          {/* Metric pill */}
          <div
            style={{
              textAlign: "center",
              padding: "0.4rem 0.75rem",
              borderRadius: 10,
              background: `${accent}18`,
              border: `1px solid ${accent}33`,
              flexShrink: 0,
              minWidth: 64,
            }}
          >
            <div style={{ fontSize: "1rem", fontWeight: 700, color: accent, lineHeight: 1.2 }}>
              {metric}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 1 }}>
              {metricLabel}
            </div>
          </div>
        </div>

        {/* Description — flex:1 so cards equalize height */}
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text2)",
            lineHeight: 1.65,
            margin: 0,
            flex: 1,
          }}
        >
          {description}
        </p>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[
            { icon: "◎", label: "Model", value: model },
            { icon: "⊞", label: "Features", value: String(features) },
            ...(isClassification && classes !== null
              ? [{ icon: "◈", label: "Classes", value: String(classes) }]
              : []),
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {m.label}
              </span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Dataset */}
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text3)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="8" cy="5" rx="6" ry="2.5" />
            <path d="M2 5v6c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5" />
            <path d="M2 8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" />
          </svg>
          {dataset}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "auto" }}>
          <button
            onClick={() => {
              const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
              let palette = "cosmic";
              try { palette = localStorage.getItem("palette") ?? "cosmic"; } catch {}
              const sep = url.includes("?") ? "&" : "?";
              window.open(`${url}${sep}theme=${theme}&palette=${palette}`, "_blank");
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.6rem 1rem",
              borderRadius: 9999,
              background: accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.82rem",
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.15s, transform 0.15s",
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            style={{
              width: 38,
              height: 38,
              borderRadius: 9999,
              border: "1px solid var(--border2)",
              background: "var(--border)",
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
              flexShrink: 0,
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
