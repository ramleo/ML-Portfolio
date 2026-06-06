"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const EXPERIENCE = [
  {
    company: "Capgemini",
    role: "Data Engineer",
    period: "Dec 2025 – Present",
    accent: "#38bdf8",
    current: true,
    description: "Current employer.",
  },
  {
    company: "JoulestoWatts Business Solutions",
    role: "Support Engineer",
    period: "Nov 2024 – Nov 2025",
    accent: "#818cf8",
    current: false,
    description: "Technical support and ML project development. Built and deployed ML systems end-to-end.",
  },
  {
    company: "SBI Life Insurance",
    role: "Business Development Executive",
    period: "May 2014 – Jul 2017",
    accent: "#34d399",
    current: false,
    description: "Business development, client management, and analytics-driven sales strategy.",
  },
  {
    company: "Veenus Cybersoft",
    role: "Junior Executive",
    period: "Oct 2013 – May 2014",
    accent: "#f59e0b",
    current: false,
    description: "Technical operations and client support in a software environment.",
  },
  {
    company: "Valuegain Distributors",
    role: "Business Development Executive",
    period: "Apr 2012 – Oct 2013",
    accent: "#a78bfa",
    current: false,
    description: "Business development and distribution operations.",
  },
  {
    company: "Statestreet Syntel Services",
    role: "Associate",
    period: "Jun 2006 – Jun 2010",
    accent: "#f87171",
    current: false,
    description: "Financial services operations, process execution, and data management in a global enterprise environment.",
  },
];

const fade = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="timeline" style={{ background: "var(--bg)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>

        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p className="section-label" variants={fade}>Experience</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            Career <span className="gradient-text">timeline</span>
          </motion.h2>
          <motion.p variants={fade} style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 500, marginBottom: "3.5rem" }}>
            A journey from financial services to full-stack ML engineering.
          </motion.p>

          {/* Timeline */}
          <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
            {/* Center line */}
            <div className="timeline-line" />

            {EXPERIENCE.map((exp, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={exp.company}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                  style={{
                    display: "flex",
                    justifyContent: isLeft ? "flex-start" : "flex-end",
                    marginBottom: "2.5rem",
                    position: "relative",
                  }}
                >
                  {/* Card */}
                  <div
                    style={{
                      width: "calc(50% - 2rem)",
                      background: "var(--bg-card)",
                      border: `1px solid ${exp.current ? exp.accent + "60" : "var(--border)"}`,
                      borderRadius: 14,
                      padding: "1.1rem 1.25rem",
                      boxShadow: exp.current ? `0 0 20px ${exp.accent}18` : "var(--shadow)",
                      position: "relative",
                    }}
                  >
                    {/* Top accent bar */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: exp.accent, borderRadius: "14px 14px 0 0" }} />

                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{exp.role}</div>
                        <div style={{ fontSize: "0.78rem", color: exp.accent, fontWeight: 600, marginTop: 2 }}>{exp.company}</div>
                      </div>
                      {exp.current && (
                        <span style={{
                          fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                          background: `${exp.accent}20`, color: exp.accent, border: `1px solid ${exp.accent}40`,
                          borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                        }}>
                          Now
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 6, marginBottom: 8 }}>{exp.period}</div>
                    <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{exp.description}</p>
                  </div>

                  {/* Dot on center line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "1.2rem",
                      transform: "translateX(-50%)",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: exp.accent,
                      border: "3px solid var(--bg)",
                      boxShadow: `0 0 0 2px ${exp.accent}`,
                      zIndex: 1,
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
