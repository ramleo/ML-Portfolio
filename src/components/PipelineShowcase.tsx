"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ML_UNIFIED_API } from "@/config/urls";

import STAGES from "./pipeline-showcase/stages";
import { IconTile } from "./pipeline-showcase/StageIcon";
import StageCard from "./pipeline-showcase/StageCard";

const fade = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function PipelineShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const active = STAGES.find((s) => s.step === activeStage) ?? null;

  return (
    <section id="pipeline" style={{ padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>

        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p className="section-label" variants={fade}>ML Pipeline</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            From raw data to <span className="heading-accent">live prediction</span>
          </motion.h2>
          <motion.p
            variants={fade}
            style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginBottom: "3rem" }}
          >
            A complete end-to-end ML pipeline — click any stage to explore what happens there.
          </motion.p>

          {/* Pipeline stages grid */}
          <motion.div
            variants={fade}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginBottom: "2rem",
            }}
          >
            {STAGES.map((stage, i) => (
              <StageCard
                key={stage.step}
                stage={stage}
                index={i}
                inView={inView}
                active={activeStage === stage.step}
                onToggle={() => setActiveStage(activeStage === stage.step ? null : stage.step)}
              />
            ))}
          </motion.div>

          {/* Flow hint */}
          <motion.p variants={fade} style={{ fontSize: "0.75rem", color: "var(--text3)", textAlign: "center", marginBottom: "1.5rem" }}>
            Click any stage to expand · stages run sequentially in a real pipeline
          </motion.p>

          {/* Expanded detail */}
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active.step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
              <div
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${active.accent}40`,
                  borderRadius: "var(--radius-card)",
                  padding: "1.75rem",
                  boxShadow: `0 0 0 1px ${active.accent}20, 0 12px 40px ${active.accent}15`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  {/* Tinted tile in expanded header */}
                  <IconTile step={active.step} accent={active.accent} size={44} />
                  <div>
                    <div style={{ fontSize: "0.7rem", color: active.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Stage {active.step}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>{active.title}</div>
                  </div>
                </div>

                <p style={{ fontSize: "0.9rem", color: "var(--text2)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
                  {active.description}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
                  {active.tools.map((t) => (
                    <span
                      key={t}
                      className="skill-chip"
                      style={{ background: `${active.accent}12`, color: active.accent, borderColor: `${active.accent}35` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {active.liveLink && !active.comingSoon && (
                  <a
                    href={ML_UNIFIED_API + active.liveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.5rem 1.25rem", borderRadius: 9999,
                      background: active.accent, color: "#fff",
                      fontWeight: 600, fontSize: "0.82rem", textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {active.liveLinkLabel}
                  </a>
                )}
                {active.comingSoon && (
                  <span style={{ fontSize: "0.82rem", color: "var(--text3)", fontStyle: "italic" }}>
                    MLFlow integration in progress — tracking experiments, detecting data drift, automating retraining.
                  </span>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
