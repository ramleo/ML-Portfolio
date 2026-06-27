"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

export type StageStatus = "locked" | "ready" | "running" | "done" | "error";

interface Props {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  status: StageStatus;
  metric?: string | null;
  onOpen: () => void;
  index: number;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

const BADGE_SVG = {
  width: 16,
  height: 16,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function StatusBadge({ status }: { status: StageStatus }) {
  if (status === "locked")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.06em",
        }}
      >
        <svg {...BADGE_SVG}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        LOCKED
      </span>
    );

  if (status === "ready")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#4ade80",
          letterSpacing: "0.06em",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4ade80",
            display: "inline-block",
          }}
        />
        READY
      </span>
    );

  if (status === "running")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#fbbf24",
          letterSpacing: "0.06em",
        }}
      >
        <svg {...BADGE_SVG} style={{ animation: "sc-spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        RUNNING...
      </span>
    );

  if (status === "done")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#4ade80",
          letterSpacing: "0.06em",
        }}
      >
        <svg {...BADGE_SVG}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        DONE
      </span>
    );

  if (status === "error")
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#f87171",
          letterSpacing: "0.06em",
        }}
      >
        <svg {...BADGE_SVG}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        ERROR
      </span>
    );

  return null;
}

const BTN_BASE: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  borderRadius: 8,
  padding: "0.45rem 1rem",
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};

const ARROW_SVG = {
  width: 13,
  height: 13,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function ActionButton({
  status,
  accent,
  onClick,
}: {
  status: StageStatus;
  accent: string;
  onClick: () => void;
}) {
  if (status === "locked")
    return (
      <button
        disabled
        style={{
          ...BTN_BASE,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.3)",
          cursor: "not-allowed",
        }}
      >
        Locked
      </button>
    );

  if (status === "ready")
    return (
      <button
        onClick={onClick}
        style={{ ...BTN_BASE, background: accent, color: "#000", fontWeight: 700 }}
      >
        Configure →
      </button>
    );

  if (status === "running")
    return (
      <button
        disabled
        style={{
          ...BTN_BASE,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.4)",
          cursor: "not-allowed",
        }}
      >
        Running...
      </button>
    );

  if (status === "done")
    return (
      <button
        onClick={onClick}
        style={{
          ...BTN_BASE,
          background: "transparent",
          color: accent,
          border: `1px solid ${accent}55`,
        }}
      >
        View Results →
      </button>
    );

  if (status === "error")
    return (
      <button
        onClick={onClick}
        style={{
          ...BTN_BASE,
          background: "transparent",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.4)",
        }}
      >
        Retry →
      </button>
    );

  return null;
}

export default function StageCard({
  title,
  description,
  icon,
  accent,
  status,
  metric,
  onOpen,
  index,
  cardRef,
}: Props) {
  const controls = useAnimation();

  useEffect(() => {
    if (status === "done") {
      controls.start({
        scale: [1, 1.04, 1],
        transition: { duration: 0.35 },
      });
    }
    if (status === "error") {
      controls.start({
        x: [0, -8, 8, -8, 8, 0],
        transition: { duration: 0.4 },
      });
    }
  }, [status, controls]);

  const borderColor =
    status === "done"
      ? `${accent}55`
      : status === "error"
      ? "rgba(248,113,113,0.5)"
      : "rgba(255,255,255,0.08)";

  const isRunning = status === "running";

  return (
    <>
      <style>{`
        @keyframes sc-spin { to { transform: rotate(360deg); } }
        @keyframes pipeline-running-border {
          0%   { border-color: rgba(255,255,255,0.1); }
          50%  { border-color: rgba(255,255,255,0.4); }
          100% { border-color: rgba(255,255,255,0.1); }
        }
      `}</style>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 32 }}
        animate={controls}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          delay: index * 0.08,
          type: "spring" as const,
          stiffness: 260,
          damping: 20,
        }}
        whileHover={status !== "locked" ? { scale: 1.02 } : undefined}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          padding: "1.25rem",
          minHeight: 180,
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          opacity: status === "locked" ? 0.45 : 1,
          animation: isRunning
            ? "pipeline-running-border 1.6s ease-in-out infinite"
            : "none",
          position: "relative",
          zIndex: 2,
          boxShadow:
            status === "done" ? `0 0 16px 1px ${accent}22` : "none",
          transition: "box-shadow 0.4s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${accent}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accent,
            }}
          >
            {icon}
          </div>
          <StatusBadge status={status} />
        </div>

        <div>
          <div
            style={{
              fontSize: "0.92rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "0.3rem",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "rgba(200,205,225,0.7)",
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        </div>

        {status === "done" && metric && (
          <div
            style={{
              fontSize: "0.72rem",
              color: accent,
              fontWeight: 600,
              background: `${accent}14`,
              borderRadius: 6,
              padding: "0.3rem 0.6rem",
              display: "inline-block",
              marginTop: "auto",
            }}
          >
            {metric}
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <ActionButton status={status} accent={accent} onClick={onOpen} />
        </div>
      </motion.div>
    </>
  );
}