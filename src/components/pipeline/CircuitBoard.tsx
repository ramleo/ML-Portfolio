"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  cardRefs: React.RefObject<HTMLDivElement | null>[];
  completedStages: string[];
  activeStage: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface PathData {
  d: string;
  completed: boolean;
  active: boolean;
}

const ACCENT = "#38bdf8";

export default function CircuitBoard({
  cardRefs,
  completedStages,
  activeStage,
  containerRef,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [dotPositions, setDotPositions] = useState<{ x: number; y: number }[]>([]);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    function compute() {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const next: PathData[] = [];

      for (let i = 0; i < cardRefs.length - 1; i++) {
        const fromEl = cardRefs[i]?.current;
        const toEl = cardRefs[i + 1]?.current;
        if (!fromEl || !toEl) continue;

        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();

        const x1 = fr.left - containerRect.left + fr.width / 2;
        const y1 = fr.top - containerRect.top + fr.height;
        const x2 = tr.left - containerRect.left + tr.width / 2;
        const y2 = tr.top - containerRect.top;
        const my = (y1 + y2) / 2;

        const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;

        // Connection i is "completed" when both endpoints have finished
        const srcCompleted = i < completedStages.length;
        // Connection i is "active" when it's the leading edge being processed
        const isActive =
          !srcCompleted &&
          activeStage !== null &&
          completedStages.length === i;

        next.push({ d, completed: srcCompleted, active: isActive });
      }
      setPaths(next);
    }

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [cardRefs, completedStages, activeStage, containerRef]);

  // Animate glowing dot along active paths
  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const activeIdx = paths.findIndex((p) => p.active);
    if (activeIdx === -1) {
      setDotPositions([]);
      return;
    }

    let progress = 0;

    function tick() {
      progress = (progress + 0.006) % 1;
      const pathEls = svgRef.current?.querySelectorAll<SVGPathElement>("[data-circuit-path]");
      if (!pathEls || pathEls.length === 0) return;

      const dots: { x: number; y: number }[] = [];
      paths.forEach((p, i) => {
        if (!p.active) return;
        const el = pathEls[i];
        if (!el) return;
        try {
          const len = el.getTotalLength();
          const pt = el.getPointAtLength(progress * len);
          dots.push({ x: pt.x, y: pt.y });
        } catch {
          // getBoundingClientRect not ready yet
        }
      });
      setDotPositions(dots);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [paths]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        overflow: "visible",
      }}
    >
      <defs>
        <filter id="circuit-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {paths.map((p, i) => (
        <path
          key={i}
          data-circuit-path={i}
          d={p.d}
          fill="none"
          stroke={
            p.completed
              ? ACCENT
              : p.active
              ? "rgba(255,255,255,0.25)"
              : "rgba(255,255,255,0.1)"
          }
          strokeWidth={p.completed ? 1.5 : 1}
          strokeDasharray={p.completed ? undefined : "6 4"}
          filter={p.completed ? "url(#circuit-glow)" : undefined}
          style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
        />
      ))}

      {dotPositions.map((dot, i) => (
        <circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={4}
          fill={ACCENT}
          filter="url(#circuit-glow)"
          opacity={0.9}
        />
      ))}
    </svg>
  );
}