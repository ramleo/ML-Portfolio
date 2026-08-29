"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import capabilities from "@/data/capabilities";
import registry from "@/data/registry.json";

// Two faces used to carry claims nothing on the site backs up: "96.7% Accuracy"
// (the same unsourced figure the hero showed) and "4+ Live Apps" (stale — there
// are three platforms and 50 tools). Both are now counted from this repo's own
// data, so they stay true on their own. The remaining faces are facts about the
// author, not measured results.
const FACES = [
  { label: String(capabilities.length), sub: "Live Tools", color: "#6366f1" },
  { label: String(registry.length),     sub: "Platforms",  color: "#38bdf8" },
  { label: "2+",    sub: "Years ML",  color: "#34d399" },
  { label: "3.7/4", sub: "GPA",       color: "#f59e0b" },
  { label: "CNN",   sub: "DL Expert", color: "#a78bfa" },
  { label: "RAG",   sub: "Gen AI",    color: "#f87171" },
];

export default function DataCube3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState(-20);
  const [rotY, setRotY] = useState(30);
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const autoRotY = useRef(30);
  const rafRef = useRef<number | null>(null);

  const startAutoRotate = () => {
    const tick = () => {
      if (!dragging) {
        autoRotY.current += 0.3;
        setRotY(autoRotY.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAutoRotate = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    stopAutoRotate();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setRotY((r) => r + dx * 0.6);
    setRotX((r) => Math.max(-60, Math.min(60, r - dy * 0.6)));
    autoRotY.current = rotY + dx * 0.6;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = () => {
    setDragging(false);
    startAutoRotate();
  };

  const s = 110;

  const faces = [
    { transform: `translateZ(${s / 2}px)`,                            idx: 0 },
    { transform: `rotateY(180deg) translateZ(${s / 2}px)`,            idx: 1 },
    { transform: `rotateY(90deg) translateZ(${s / 2}px)`,             idx: 2 },
    { transform: `rotateY(-90deg) translateZ(${s / 2}px)`,            idx: 3 },
    { transform: `rotateX(90deg) translateZ(${s / 2}px)`,             idx: 4 },
    { transform: `rotateX(-90deg) translateZ(${s / 2}px)`,            idx: 5 },
  ];

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      onViewportEnter={() => startAutoRotate()}
      onViewportLeave={stopAutoRotate}
      style={{
        width: s,
        height: s,
        perspective: 500,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        flexShrink: 0,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: dragging ? "none" : undefined,
        }}
      >
        {faces.map(({ transform, idx }) => {
          const face = FACES[idx];
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                inset: 0,
                transform,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: `${face.color}14`,
                border: `1.5px solid ${face.color}40`,
                borderRadius: 12,
                backdropFilter: "blur(4px)",
                boxShadow: `inset 0 0 20px ${face.color}0a, 0 0 12px ${face.color}18`,
              }}
            >
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: face.color, lineHeight: 1 }}>
                {face.label}
              </span>
              <span style={{ fontSize: "0.55rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4, fontWeight: 600 }}>
                {face.sub}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
