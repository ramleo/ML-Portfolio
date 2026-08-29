"use client";

import { useRef, Suspense, lazy } from "react";
import { motion, useInView } from "framer-motion";
import { SiteIcon } from "./SiteIcons";

const DataCube3D = lazy(() => import("./DataCube3D"));

const COMPETENCIES = [
  "Machine Learning", "Deep Learning", "Generative AI", "Computer Vision",
  "Natural Language Processing", "Model Deployment", "Data Visualization",
  "Statistical Analysis", "Business Intelligence", "Web Scraping",
  "Docker & Containers", "Cloud (GCP)",
];

const CONTACTS = [
  { label: "LinkedIn",  value: "WRamakrishnasai",       href: "https://linkedin.com/in/WRamakrishnasai", icon: "in" },
  { label: "GitHub",    value: "github.com/ramleo",     href: "https://github.com/ramleo",               icon: "gh" },
  { label: "DockerHub", value: "hub.docker.com/u/wram", href: "https://hub.docker.com/u/wram",           icon: "docker" },
  { label: "Location",  value: "Hyderabad, India",      href: "#",                                       icon: "location" },
];

const fade = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="about" style={{ background: "var(--bg-section)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>

        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Label + heading */}
          <motion.p className="section-label" variants={fade}>About</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            Building ML — <span className="heading-accent">end to end</span>
          </motion.h2>
          <motion.p
            variants={fade}
            style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 560, marginBottom: "3rem" }}
          >
            From raw data to deployed prediction APIs — every system built, tested, and live.
          </motion.p>

          {/* Two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "3rem", alignItems: "start" }}>

            {/* Left — Avatar + bio */}
            <motion.div variants={fade} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "var(--brand-gradient)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: "0 0 0 4px var(--border2)",
                    animation: "float 4s ease-in-out infinite",
                  }}
                >
                  RW
                </div>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Ramakrishnasai Wuppalapati</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text2)", marginTop: 2 }}>ML Engineer · Data Scientist · AI Builder</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", display: "inline-block" }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>Available for ML roles</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p style={{ fontSize: "0.92rem", color: "var(--text2)", lineHeight: 1.8 }}>
                Achievement-driven ML professional with a PG Diploma in Data Science from IIIT-Bangalore (3.7/4).
                I build complete systems — not just notebooks — covering data ingestion, EDA, feature engineering,
                model training, evaluation, and deployment via REST APIs.
              </p>
              <p style={{ fontSize: "0.92rem", color: "var(--text2)", lineHeight: 1.8 }}>
                My work spans classical ML, deep learning (CNN/RNN/Transfer Learning), NLP, computer vision,
                and Generative AI (RAG, Agents, LangChain). Every project here is live and interactive.
              </p>

              {/* Contact links */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {CONTACTS.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      textDecoration: "none",
                      color: "var(--text2)",
                      fontSize: "0.82rem",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
                  >
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: "var(--border)", border: "1px solid var(--border2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, color: "var(--text2)",
                      }}
                    >
                      <SiteIcon id={c.icon} size={14} />
                    </span>
                    {c.value}
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Right — Competencies */}
            <motion.div variants={fade}>
              <p className="section-label" style={{ marginBottom: "1rem" }}>Core Competencies</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2.5rem" }}>
                {COMPETENCIES.map((c, i) => (
                  <motion.span
                    key={c}
                    className="tag"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                    style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                  >
                    {c}
                  </motion.span>
                ))}
              </div>

              {/* Rotating data cube */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
                <Suspense fallback={null}>
                  <DataCube3D />
                </Suspense>
                <div>
                  <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Key Metrics</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: 1.6 }}>
                    Drag to rotate · each face shows a<br />live project stat
                  </p>
                </div>
              </div>

              {/* Highlights */}
              <p className="section-label" style={{ marginBottom: "1rem" }}>Education</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { degree: "PG Diploma in Data Science", spec: "Specialization in Deep Learning", institution: "IIIT-Bangalore × upGrad", year: "2021", grade: "3.7 / 4.0" },
                  { degree: "Bachelor of Commerce", spec: "Accounts & Economics", institution: "Mumbai University", year: "2005", grade: "62%" },
                ].map((e) => (
                  <div
                    key={e.degree}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "0.9rem 1.1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{e.degree}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: 2 }}>{e.spec}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2 }}>{e.institution}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#818cf8" }}>{e.grade}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: 2 }}>{e.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
