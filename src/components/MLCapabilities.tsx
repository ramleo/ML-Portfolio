"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import capabilities, { type Capability } from "@/data/capabilities";

// ── Icons ────────────────────────────────────────────────────────────────────
function CapabilityIcon({
  id,
  accent,
  size = 22,
}: {
  id: Capability["icon"];
  accent: string;
  size?: number;
}) {
  const p = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none" as const,
    stroke: accent,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (id) {
    case "automl":
      return (
        <svg {...p}>
          <circle cx="5"  cy="12" r="2" fill={accent} fillOpacity={0.18} />
          <circle cx="12" cy="5"  r="2" fill={accent} fillOpacity={0.18} />
          <circle cx="19" cy="12" r="2" fill={accent} fillOpacity={0.18} />
          <circle cx="12" cy="19" r="2" fill={accent} fillOpacity={0.18} />
          <circle cx="12" cy="12" r="2.5" fill={accent} fillOpacity={0.3} />
          <line x1="7"  y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="17" y2="12" />
          <line x1="12" y1="7"  x2="12" y2="10" />
          <line x1="12" y1="14" x2="12" y2="17" />
        </svg>
      );
    case "optuna":
      return (
        <svg {...p}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
          <polyline points="16 6 22 6 22 12" />
          <path d="M22 6 12 16l-4-4-6 6" strokeWidth={1.5} />
        </svg>
      );
    case "featureeng":
      return (
        <svg {...p}>
          <rect x="2" y="3" width="6" height="6" rx="1" fill={accent} fillOpacity={0.14} />
          <rect x="9" y="3" width="6" height="6" rx="1" fill={accent} fillOpacity={0.08} />
          <rect x="16" y="3" width="6" height="6" rx="1" fill={accent} fillOpacity={0.08} />
          <rect x="2" y="15" width="6" height="6" rx="1" fill={accent} fillOpacity={0.08} />
          <rect x="9" y="15" width="6" height="6" rx="1" fill={accent} fillOpacity={0.14} />
          <rect x="16" y="15" width="6" height="6" rx="1" fill={accent} fillOpacity={0.08} />
          <line x1="5"  y1="9"  x2="5"  y2="15" />
          <line x1="12" y1="9"  x2="12" y2="15" />
          <line x1="19" y1="9"  x2="19" y2="15" />
        </svg>
      );
    case "shap":
      return (
        <svg {...p}>
          <line x1="4" y1="6"  x2="16" y2="6"  strokeWidth={2.5} stroke={accent} strokeOpacity={0.9} />
          <line x1="4" y1="10" x2="13" y2="10" strokeWidth={2.5} stroke={accent} strokeOpacity={0.7} />
          <line x1="4" y1="14" x2="10" y2="14" strokeWidth={2.5} stroke={accent} strokeOpacity={0.5} />
          <line x1="4" y1="18" x2="7"  y2="18" strokeWidth={2.5} stroke={accent} strokeOpacity={0.3} />
          <line x1="2" y1="4"  x2="2"  y2="20" />
        </svg>
      );
    case "ensemble":
      return (
        <svg {...p}>
          <circle cx="6"  cy="8"  r="2.5" fill={accent} fillOpacity={0.2} />
          <circle cx="18" cy="8"  r="2.5" fill={accent} fillOpacity={0.2} />
          <circle cx="12" cy="8"  r="2.5" fill={accent} fillOpacity={0.2} />
          <circle cx="12" cy="18" r="3"   fill={accent} fillOpacity={0.3} />
          <line x1="6"  y1="10.5" x2="11" y2="15.5" />
          <line x1="12" y1="10.5" x2="12" y2="15"   />
          <line x1="18" y1="10.5" x2="13" y2="15.5" />
        </svg>
      );
    case "preprocessing":
      return (
        <svg {...p}>
          {/* Funnel — narrows top to bottom, representing filtering/cleaning */}
          <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" fill={accent} fillOpacity={0.14} />
          <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
          {/* Sparkle dot — "clean" indicator */}
          <circle cx="19" cy="17" r="1.5" fill={accent} fillOpacity={0.6} stroke="none" />
          <line x1="19" y1="14" x2="19" y2="15" strokeWidth={1.5} />
          <line x1="19" y1="19" x2="19" y2="20" strokeWidth={1.5} />
          <line x1="16.5" y1="17" x2="17.5" y2="17" strokeWidth={1.5} />
          <line x1="20.5" y1="17" x2="21.5" y2="17" strokeWidth={1.5} />
        </svg>
      );
    case "featureselect":
      return (
        <svg {...p}>
          {/* Three ranked rows — each shorter than the last, with a check on the top two */}
          <polyline points="3,6 5,8.5 7.5,4.5" strokeWidth={1.8} />
          <line x1="10" y1="6" x2="21" y2="6" />
          <polyline points="3,12 5,14.5 7.5,10.5" strokeWidth={1.8} />
          <line x1="10" y1="12" x2="18" y2="12" />
          {/* Third row — crossed out (not selected) */}
          <line x1="3" y1="18" x2="7" y2="18" strokeOpacity={0.35} />
          <line x1="5" y1="16" x2="5" y2="20" strokeOpacity={0.35} />
          <line x1="10" y1="18" x2="15" y2="18" strokeOpacity={0.35} />
        </svg>
      );
    default:
      return null;
  }
}

// ── Single card ──────────────────────────────────────────────────────────────
function CapabilityCard({
  cap,
  index,
}: {
  cap: Capability;
  index: number;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      style={{
        flexShrink: 0,
        width: "clamp(240px, 28vw, 300px)",
        height: "100%",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 16,
        boxShadow: "var(--glass-shadow)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Accent bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${cap.accent}, ${cap.accent}55)`,
          flexShrink: 0,
        }}
      />

      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${cap.accent}18`,
            border: `1px solid ${cap.accent}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CapabilityIcon id={cap.icon} accent={cap.accent} size={20} />
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.65rem", color: cap.accent, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
            {cap.subtitle}
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem", lineHeight: 1.3 }}>
            {cap.title}
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>
            {cap.description}
          </p>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {cap.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.62rem",
                fontWeight: 600,
                padding: "0.18rem 0.55rem",
                borderRadius: 9999,
                background: `${cap.accent}14`,
                color: cap.accent,
                border: `1px solid ${cap.accent}28`,
                letterSpacing: "0.01em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            let palette = "cosmic";
            try { palette = localStorage.getItem("palette") ?? "cosmic"; } catch {}
            const theme = document.documentElement.getAttribute("data-theme") ?? "dark";
            window.open(`${cap.link}&theme=${theme}&palette=${palette}`, "_blank");
          }}
          style={{
            marginTop: "auto",
            width: "100%",
            padding: "0.55rem 1rem",
            borderRadius: 9999,
            background: `${cap.accent}18`,
            border: `1px solid ${cap.accent}40`,
            color: cap.accent,
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "background 0.15s, transform 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${cap.accent}30`;
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${cap.accent}18`;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {cap.linkLabel}
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 10L10 2M10 2H5M10 2v5" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
// Self-contained: import this anywhere, pass no props.
// Card data lives in src/data/capabilities.ts.
// Layout rule: odd count → horizontal scroll; even count ≥ 6 → 3-column grid.
// Mobile always scrolls.
export default function MLCapabilities() {
  const isOdd   = capabilities.length % 2 !== 0;
  const isSmall = capabilities.length < 6;
  const useScroll = isOdd || isSmall;

  return (
    <section
      id="capabilities"
      style={{ padding: "5rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
          ML Capabilities
        </p>
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2, margin: 0 }}>
          What powers every{" "}
          <span className="gradient-text">prediction</span>
        </h2>
      </div>

      {/* Cards — scroll or grid depending on count */}
      {useScroll ? (
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "1rem",
            overflowX: "auto",
            paddingBottom: "1rem",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.cursor = "grab"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.cursor = "default"; }}
        >
          <style>{`#capabilities .cap-snap::-webkit-scrollbar { display: none; }`}</style>
          {capabilities.map((cap, i) => (
            <div key={cap.id} style={{ scrollSnapAlign: "start", display: "flex" }}>
              <CapabilityCard cap={cap} index={i} />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          {capabilities.map((cap, i) => (
            <CapabilityCard key={cap.id} cap={cap} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}