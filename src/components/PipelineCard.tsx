"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export interface PipelineCardProps {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  href: string;
  status: "locked" | "ready" | "done";
  metric?: string | null;
}

const statusBadge: Record<PipelineCardProps["status"], { label: string; color: string; dot?: string }> = {
  locked: { label: "Locked",  color: "rgba(150,150,170,0.7)" },
  ready:  { label: "Ready",   color: "inherit", dot: "●" },
  done:   { label: "Done",    color: "#4ade80", dot: "✓" },
};

export default function PipelineCard({
  title,
  description,
  icon,
  accent,
  href,
  status,
  metric,
}: PipelineCardProps) {
  const badge = statusBadge[status];
  const isLocked = status === "locked";
  const isDone = status === "done";

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: 320,
        background: "rgba(6,13,26,0.72)",
        border: `1px solid ${isLocked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 14,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        opacity: isLocked ? 0.5 : 1,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        boxSizing: "border-box",
        // glow on hover for non-locked via CSS class workaround with inline style
        cursor: isLocked ? "default" : "default",
      }}
      className={isLocked ? "" : "pipeline-card-hoverable"}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `${accent}26`,        // ~15% opacity
          border: `1.5px solid ${accent}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Title + description */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <span
          style={{
            fontSize: "0.97rem",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--text3, rgba(180,185,210,0.75))",
            lineHeight: 1.45,
          }}
        >
          {description}
        </span>
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        {badge.dot && (
          <span
            style={{
              fontSize: isDone ? "0.7rem" : "0.55rem",
              color: isDone ? "#4ade80" : accent,
              lineHeight: 1,
            }}
          >
            {badge.dot}
          </span>
        )}
        {!badge.dot && (
          <span style={{ fontSize: "0.65rem", color: badge.color }}>🔒</span>
        )}
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: isLocked ? "rgba(150,150,170,0.7)" : isDone ? "#4ade80" : accent,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Metric line */}
      {isDone && metric && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "#4ade80",
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.18)",
            borderRadius: 6,
            padding: "0.25rem 0.5rem",
            lineHeight: 1.4,
          }}
        >
          {metric}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Action button */}
      {isLocked ? (
        <button
          disabled
          style={{
            width: "100%",
            padding: "0.5rem 0",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(150,150,170,0.5)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "not-allowed",
          }}
        >
          Locked
        </button>
      ) : (
        <Link
          href={href}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem 0",
            borderRadius: 8,
            border: `1px solid ${accent}55`,
            background: `${accent}1a`,
            color: accent,
            fontSize: "0.8rem",
            fontWeight: 600,
            textAlign: "center",
            textDecoration: "none",
            transition: "background 0.15s ease",
            boxSizing: "border-box",
          }}
        >
          Open →
        </Link>
      )}

      {/* Hover glow style injected once */}
      <style>{`
        .pipeline-card-hoverable:hover {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.13), 0 4px 24px rgba(0,0,0,0.35);
          border-color: rgba(255,255,255,0.16) !important;
        }
      `}</style>
    </div>
  );
}
