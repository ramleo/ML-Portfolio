"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import capabilities, { type Capability } from "@/data/capabilities";
import { PipelineProvider } from "@/context/PipelineContext";
import AutoMLModal, { type TrainResult, type HistoryEntry } from "@/components/modals/AutoMLModal";

// ── Single card — design mirrors ProjectCard exactly ─────────────────────────
function CapabilityCard({ cap, index, onRunHere }: { cap: Capability; index: number; onRunHere?: () => void }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const [tilt, setTilt]       = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: cy * -10, y: cx * 10 });
  };

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => { setHovering(false); setTilt({ x: 0, y: 0 }); };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      style={{ flexShrink: 0, width: "clamp(280px, 30vw, 320px)", height: "100%", display: "flex" }}
    >
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--bg-glass)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${hovering ? cap.accent + "44" : "var(--border)"}`,
        transform: hovering
          ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: hovering
          ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
          : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
        boxShadow: hovering
          ? `0 0 0 1px ${cap.accent}55, 0 0 30px ${cap.accent}55, 0 20px 60px ${cap.accent}33, 0 8px 24px rgba(0,0,0,0.4)`
          : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Shimmer overlay */}
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
      <div style={{ height: 3, background: cap.accent, flexShrink: 0, position: "relative", zIndex: 1 }} />

      <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem", position: "relative", zIndex: 1 }}>
        {/* Header row: badge pill + stat pill */}
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
                background: `${cap.accent}22`,
                color: cap.accent,
                border: `1px solid ${cap.accent}44`,
                marginBottom: "0.5rem",
              }}
            >
              {cap.subtitle}
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
              {cap.title}
            </h3>
          </div>
          {/* Stat pill */}
          <div
            style={{
              textAlign: "center",
              padding: "0.4rem 0.75rem",
              borderRadius: 10,
              background: `${cap.accent}18`,
              border: `1px solid ${cap.accent}33`,
              flexShrink: 0,
              minWidth: 64,
            }}
          >
            <div style={{ fontSize: "1rem", fontWeight: 700, color: cap.accent, lineHeight: 1.2 }}>
              {cap.stat}
            </div>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 1 }}>
              {cap.statLabel}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.65, margin: 0, flex: 1 }}>
          {cap.description}
        </p>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Model", value: cap.model },
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

        {/* Input / dataset row */}
        <div style={{ fontSize: "0.75rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="8" cy="5" rx="6" ry="2.5" />
            <path d="M2 5v6c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V5" />
            <path d="M2 8c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" />
          </svg>
          {cap.input}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {cap.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "auto" }}>
          {cap.modalEnabled && onRunHere ? (
            <button
              onClick={onRunHere}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.6rem 1rem",
                borderRadius: 9999,
                background: cap.accent,
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
              Try it
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => {
                const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
                let palette = "cosmic";
                try { palette = localStorage.getItem("palette") ?? "cosmic"; } catch {}
                const sep = cap.link.includes("?") ? "&" : "?";
                window.open(`${cap.link}${sep}theme=${theme}&palette=${palette}`, "_blank");
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.6rem 1rem",
                borderRadius: 9999,
                background: cap.accent,
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
          )}
          <a
            href={cap.github}
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
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
// Self-contained: import this anywhere, pass no props.
// Card data lives in src/data/capabilities.ts.
// Layout rule: odd count → horizontal scroll; even count ≥ 6 → 3-column grid.
// Mobile always scrolls.
export default function MLCapabilities() {
  const isOdd     = capabilities.length % 2 !== 0;
  const isSmall   = capabilities.length < 6;
  const useScroll = isOdd || isSmall;
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [automlResult, setAutomlResult]   = useState<TrainResult | null>(null);
  const [automlHistory, setAutomlHistory] = useState<HistoryEntry[]>([]);

  return (
    <PipelineProvider>
      <>
        {openModal === "automl" && (
          <AutoMLModal
            onClose={() => setOpenModal(null)}
            onSavedToPipeline={() => { setAutomlResult(null); setAutomlHistory([]); }}
            initialResult={automlResult}
            initialHistory={automlHistory}
            onResultChange={(r, h) => { setAutomlResult(r); setAutomlHistory(h); }}
          />
        )}
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

      {useScroll ? (
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "1.25rem",
            overflowX: "auto",
            paddingBottom: "1rem",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <style>{`#capabilities div::-webkit-scrollbar { display: none; }`}</style>
          {capabilities.map((cap, i) => (
            <div key={cap.id} style={{ scrollSnapAlign: "start", display: "flex" }}>
              <CapabilityCard
                cap={cap}
                index={i}
                onRunHere={cap.modalEnabled ? () => setOpenModal(cap.id) : undefined}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
            alignItems: "stretch",
          }}
        >
          {capabilities.map((cap, i) => (
            <CapabilityCard
              key={cap.id}
              cap={cap}
              index={i}
              onRunHere={cap.modalEnabled ? () => setOpenModal(cap.id) : undefined}
            />
          ))}
        </div>
      )}
        </section>
      </>
    </PipelineProvider>
  );
}