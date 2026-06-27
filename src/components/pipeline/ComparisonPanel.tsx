"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface PipelineResult {
  score: number;
  winner: string;
  time_ms: number;
}

interface ComparisonPanelProps {
  resultA: PipelineResult | null;
  resultB: PipelineResult | null;
  difference: number;
  winner: "a" | "b" | "tie" | null;
  isRunning: boolean;
}

const ACCENT_A = "#38bdf8";
const ACCENT_B = "#a78bfa";

function useCountUp(target: number | null, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplay(0);
      return;
    }
    startRef.current = null;

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

interface ResultColumnProps {
  result: PipelineResult | null;
  label: string;
  accent: string;
  isWinner: boolean;
}

function ResultColumn({ result, label, accent, isWinner }: ResultColumnProps) {
  const animatedScore = useCountUp(result?.score ?? null);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
      }}
    >
      {/* Column header */}
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {label}
      </span>

      {result ? (
        <>
          {/* Score */}
          <span
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              lineHeight: 1.1,
              color: isWinner ? "#4ade80" : "rgba(215,220,235,0.95)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {animatedScore.toFixed(4)}
          </span>

          {/* Winner model name */}
          <span
            style={{
              fontSize: "0.85rem",
              color: "rgba(200,205,225,0.7)",
              textAlign: "center",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {result.winner}
          </span>

          {/* Time */}
          <span
            style={{
              fontSize: "0.78rem",
              color: "rgba(200,205,225,0.4)",
            }}
          >
            Time:{" "}
            {result.time_ms >= 1000
              ? `${(result.time_ms / 1000).toFixed(2)}s`
              : `${result.time_ms}ms`}
          </span>
        </>
      ) : (
        <span
          style={{
            fontSize: "2.4rem",
            fontWeight: 800,
            color: "rgba(200,205,225,0.15)",
          }}
        >
          —
        </span>
      )}
    </div>
  );
}

export default function ComparisonPanel({
  resultA,
  resultB,
  difference,
  winner,
  isRunning,
}: ComparisonPanelProps) {
  const iconProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  function renderDelta() {
    if (isRunning) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "rgba(200,205,225,0.5)",
            fontSize: "0.82rem",
          }}
        >
          <motion.svg
            {...iconProps}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </motion.svg>
          Running pipelines...
        </div>
      );
    }

    if (winner === "a") {
      return (
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: ACCENT_A,
          }}
        >
          Pipeline A wins by +{difference.toFixed(4)}
        </span>
      );
    }

    if (winner === "b") {
      return (
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: ACCENT_B,
          }}
        >
          Pipeline B wins by +{difference.toFixed(4)}
        </span>
      );
    }

    if (winner === "tie") {
      return (
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "rgba(200,205,225,0.5)",
          }}
        >
          Tie — equal performance
        </span>
      );
    }

    return null;
  }

  return (
    <div
      style={{
        background: "rgba(13,17,28,0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "1.5rem",
        marginTop: "2rem",
      }}
    >
      {/* Two-column layout */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        <ResultColumn
          result={resultA}
          label="Pipeline A"
          accent={ACCENT_A}
          isWinner={winner === "a"}
        />

        {/* Vertical divider */}
        <div
          style={{
            width: 1,
            alignSelf: "stretch",
            background: "rgba(255,255,255,0.07)",
            margin: "0.25rem 0",
          }}
        />

        <ResultColumn
          result={resultB}
          label="Pipeline B"
          accent={ACCENT_B}
          isWinner={winner === "b"}
        />
      </div>

      {/* Delta badge row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "1.1rem",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          minHeight: "2rem",
        }}
      >
        {renderDelta()}
      </div>
    </div>
  );
}