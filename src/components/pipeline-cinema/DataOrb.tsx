"use client";

import { motion } from "framer-motion";

interface Props {
  x: number;
  y: number;
  active: boolean;
  color?: string;
}

const TRAILS = [
  { offset: -10, size: 12, opacity: 0.6 },
  { offset: -20, size: 8, opacity: 0.35 },
  { offset: -30, size: 5, opacity: 0.15 },
];

export default function DataOrb({ x, y, active, color = "#38bdf8" }: Props) {
  return (
    <div style={{ position: "relative" }}>
      {/* Trailing particles */}
      {active &&
        TRAILS.map(({ offset, size, opacity }) => (
          <motion.div
            key={offset}
            style={{
              position: "absolute",
              left: x + offset - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, white 0%, ${color} 60%, transparent 100%)`,
              boxShadow: `0 0 6px 2px ${color}66`,
              opacity,
              pointerEvents: "none",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            transition={{ duration: 0.2 }}
          />
        ))}

      {/* Core orb */}
      <motion.div
        style={{
          position: "absolute",
          left: x - 10,
          top: y - 10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: `radial-gradient(circle, white 0%, ${color} 55%, transparent 100%)`,
          boxShadow: `0 0 12px 4px ${color}88, 0 0 24px 8px ${color}44`,
          pointerEvents: "none",
        }}
        animate={
          active
            ? { scale: [1, 1.4, 1], opacity: [0.9, 1, 0.9] }
            : { scale: 1, opacity: 0.5 }
        }
        transition={
          active
            ? { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
            : { duration: 0.4 }
        }
      />
    </div>
  );
}