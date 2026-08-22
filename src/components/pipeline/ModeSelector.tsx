"use client";

import React from "react";
import { motion } from "framer-motion";

type Mode = "guided" | "express" | "ab";

interface Props {
  onSelect: (mode: Mode) => void;
}

const S = {
  width: 22,
  height: 22,
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

function GuidedIcon() {
  return (
    <svg {...S}>
      <path d="M5 12h14M15 6l6 6-6 6" />
      <path d="M3 6h2M3 18h2" />
    </svg>
  );
}

function ExpressIcon() {
  return (
    <svg {...S}>
      <path d="M13 2 L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

function ABIcon() {
  return (
    <svg {...S}>
      <path d="M6 3v3m0 12v3m12-9h-3M9 6H6m0 0C6 9 9 12 12 12s6 3 6 6m-12 0c0-3 3-6 6-6" />
    </svg>
  );
}

interface ModeConfig {
  id: Mode;
  title: string;
  description: string;
  accent: string;
  Icon: () => React.ReactElement;
}

const MODES: ModeConfig[] = [
  {
    id: "guided",
    title: "Guided Mode",
    description:
      "Configure and run one stage at a time. See results after each step before moving to the next.",
    accent: "#38bdf8",
    Icon: GuidedIcon,
  },
  {
    id: "express",
    title: "Express Mode",
    description:
      "Configure all 7 stages at once, then run the full pipeline. Watch it execute with live animations.",
    accent: "#22c55e",
    Icon: ExpressIcon,
  },
  {
    id: "ab",
    title: "A/B Compare",
    description:
      "Run two different pipeline configurations on the same dataset. Compare which performs better.",
    accent: "#a78bfa",
    Icon: ABIcon,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 22 },
  },
};

export default function ModeSelector({ onSelect }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: "2rem 1.5rem",
        gap: "2.5rem",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center" }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          How would you like to build your pipeline?
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--text2)",
            marginTop: "0.6rem",
          }}
        >
          Choose a mode to get started
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem",
          width: "100%",
          maxWidth: 960,
        }}
      >
        {MODES.map((m) => (
          <motion.div
            key={m.id}
            variants={cardVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(m.id)}
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "2rem 1.5rem",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${m.accent}55`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px 2px ${m.accent}22`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${m.accent}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: m.accent,
              }}
            >
              <m.Icon />
            </div>
            <div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "0.4rem",
                }}
              >
                {m.title}
              </div>
              <div
                style={{
                  fontSize: "0.83rem",
                  color: "var(--text2)",
                  lineHeight: 1.55,
                }}
              >
                {m.description}
              </div>
            </div>
            <div
              style={{
                marginTop: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: m.accent,
              }}
            >
              Select
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}