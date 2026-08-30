"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconTile } from "./StageIcon";
import type { Stage } from "./stages";

/**
 * One stage tile in the row. Note the name: there is a different StageCard in
 * components/pipeline/, belonging to the Pipeline Builder tool — this folder
 * exists so the two never get imported for each other.
 */
function StageCard({
  stage,
  index,
  inView,
  active,
  onToggle,
}: {
  stage: Stage;
  index: number;
  inView: boolean;
  active: boolean;
  onToggle: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -10, y: cx * 10 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2 + index * 0.07, duration: 0.4 }}
      style={{ position: "relative", height: "100%" }}
    >
      {/* .subtle-card carries the entire surface — background, border, radius,
          shadow, and whatever it does about backdrop blur. Copying those values
          by hand is what made these look wrong: the copy kept a
          `backdrop-filter: blur(14px)` that .subtle-card does not actually
          apply, and blurring the dotted page background behind each card
          smeared it into a pale haze, so the same rgba fill read several shades
          lighter than the platform cards. Only what a stage card needs beyond
          the shared surface stays inline. */}
      <div
        className="subtle-card"
        onClick={onToggle}
        onMouseMove={onMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
        style={{
          height: "100%",
          padding: "1.1rem 0.9rem",
          textAlign: "center",
          cursor: "pointer",
          overflow: "hidden",
          // Accent only while expanded — that is state, not decoration.
          ...(active ? { borderColor: `${stage.accent}60` } : null),
          transform: hovering
            ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-5px)`
            : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
          transition: hovering
            ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
            : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
          opacity: stage.comingSoon ? 0.65 : 1,
        }}
      >
        {/* Shimmer overlay — sits exactly on the card above, so its radius has
            to track the same token or the highlight's corners overhang it. */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "var(--radius-card)",
          background: hovering
            ? `radial-gradient(circle at ${50 + tilt.y * 4}% ${50 - tilt.x * 4}%, rgba(255,255,255,0.07) 0%, transparent 65%)`
            : "none",
          pointerEvents: "none",
        }} />

        {/* Coming soon badge */}
        {stage.comingSoon && (
          <span style={{
            position: "absolute", top: 10, right: 6,
            fontSize: "0.55rem", fontWeight: 700,
            background: "#64748b22", color: "#64748b",
            borderRadius: 4, padding: "1px 5px",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            Soon
          </span>
        )}

        {/* Icon tile */}
        <IconTile step={stage.step} accent={stage.accent} />

        {/* Step badge */}
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: `${stage.accent}20`, border: `1px solid ${stage.accent}50`,
          color: stage.accent, fontSize: "0.65rem", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 0.5rem",
        }}>
          {stage.step}
        </div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
          {stage.title}
        </div>
      </div>
    </motion.div>
  );
}

export default StageCard;
