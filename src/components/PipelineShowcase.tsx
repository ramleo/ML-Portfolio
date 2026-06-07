"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const STAGES = [
  {
    step: 1, title: "Data Ingestion", accent: "#34d399",
    tools: ["CSV Upload", "REST APIs", "Web Scraping", "Selenium", "Scrapy", "BeautifulSoup"],
    description: "Collect raw data from any source — upload CSV files, call REST APIs, or scrape websites with Selenium, Scrapy, or BeautifulSoup. This is where every ML project begins.",
    liveLink: "https://ml-unified.onrender.com/?mode=eda",
    liveLinkLabel: "Try EDA Explorer →",
  },
  {
    step: 2, title: "Exploratory Analysis", accent: "#38bdf8",
    tools: ["Pandas", "NumPy", "Plotly", "Distributions", "Correlations", "Outliers"],
    description: "Understand the data before touching it. Distributions, missing values, correlations, outlier detection, type inference — visualized interactively.",
    liveLink: "https://ml-unified.onrender.com/?mode=eda",
    liveLinkLabel: "Open EDA Explorer →",
  },
  {
    step: 3, title: "Feature Engineering", accent: "#a78bfa",
    tools: ["Encoding", "Scaling", "PCA", "LDA", "SHAP", "Feature Selection", "SMOTE", "ADASYN"],
    description: "Clean, encode, scale, and select features. Reduce dimensionality with PCA/LDA. Handle class imbalance with SMOTE and ADASYN. Identify important features with SHAP.",
    liveLink: null, liveLinkLabel: null,
  },
  {
    step: 4, title: "Model Training", accent: "#f59e0b",
    tools: ["Scikit-learn", "XGBoost", "LightGBM", "CatBoost", "PyTorch", "GridSearchCV", "Auto-ML"],
    description: "Select and train the right algorithm — from Linear Regression and Random Forest to XGBoost, deep learning (CNN/RNN), and Auto-ML pipelines with hyperparameter tuning.",
    liveLink: "https://ml-unified.onrender.com/?mode=ml",
    liveLinkLabel: "Try ML Platform →",
  },
  {
    step: 5, title: "Evaluation", accent: "#f87171",
    tools: ["Accuracy", "AUC-ROC", "Confusion Matrix", "Precision", "Recall", "F-Beta", "SHAP", "LIME"],
    description: "Measure model performance with the right metrics for the task. Interpret black-box predictions with SHAP and LIME. Validate on held-out data.",
    liveLink: "https://ml-unified.onrender.com/?mode=ml",
    liveLinkLabel: "See Live Results →",
  },
  {
    step: 6, title: "Deployment", accent: "#818cf8",
    tools: ["FastAPI", "Flask", "Docker", "Render", "Vercel", "GCP", "Postman"],
    description: "Serve predictions via REST API with FastAPI or Flask. Containerize with Docker. Deploy to Render (ML backends) or Vercel (frontends). Every app here is live.",
    liveLink: "https://ml-unified.onrender.com/?mode=vision",
    liveLinkLabel: "Try Vision Platform →",
  },
  {
    step: 7, title: "Monitoring", accent: "#64748b",
    tools: ["MLFlow", "Data Drift", "Model Drift", "Dashboards", "Alerts"],
    description: "Track model performance over time, detect data drift and concept drift, log experiments with MLFlow, and trigger retraining pipelines when performance degrades.",
    liveLink: null,
    liveLinkLabel: "Coming Soon",
    comingSoon: true,
  },
];

function StageIcon({ step, accent, size = 22 }: { step: number; accent: string; size?: number }) {
  const props = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none" as const,
    stroke: accent,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (step) {
    case 1: // Database cylinder — data being ingested
      return (
        <svg {...props}>
          <ellipse cx="12" cy="5" rx="9" ry="3" fill={accent} fillOpacity={0.15} />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      );
    case 2: // Magnifier — exploratory search
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" fill={accent} fillOpacity={0.08} />
          <path d="M21 21l-4.35-4.35" />
          <circle cx="9"  cy="10" r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
          <circle cx="13" cy="9"  r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
          <circle cx="12" cy="13" r="1.2" fill={accent} fillOpacity={0.7} stroke="none" />
        </svg>
      );
    case 3: // Sliders — feature tuning
      return (
        <svg {...props}>
          <line x1="4" y1="6"  x2="20" y2="6"  />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8"  cy="6"  r="2.5" fill={accent} fillOpacity={0.18} />
          <circle cx="16" cy="12" r="2.5" fill={accent} fillOpacity={0.18} />
          <circle cx="11" cy="18" r="2.5" fill={accent} fillOpacity={0.18} />
        </svg>
      );
    case 4: // Stacked layers — model architecture
      return (
        <svg {...props}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill={accent} fillOpacity={0.15} />
          <path d="M2 12l10 5 10-5" />
          <path d="M2 17l10 5 10-5" />
        </svg>
      );
    case 5: // Bar chart — evaluation metrics
      return (
        <svg {...props}>
          <rect x="4"  y="13" width="4" height="8" rx="1" fill={accent} fillOpacity={0.15} />
          <rect x="10" y="7"  width="4" height="14" rx="1" fill={accent} fillOpacity={0.15} />
          <rect x="16" y="10" width="4" height="11" rx="1" fill={accent} fillOpacity={0.15} />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      );
    case 6: // Cloud upload — deployment
      return (
        <svg {...props}>
          <polyline points="16,16 12,12 8,16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      );
    case 7: // Activity heartbeat — monitoring
      return (
        <svg {...props}>
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
      );
    default:
      return null;
  }
}

function IconTile({ step, accent, size = 52 }: { step: number; accent: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 13,
      background: `${accent}18`,
      border: `1px solid ${accent}2e`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 0.65rem",
      flexShrink: 0,
    }}>
      <StageIcon step={step} accent={accent} size={size === 52 ? 22 : 20} />
    </div>
  );
}

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
            From raw data to <span className="gradient-text">live prediction</span>
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
              <motion.div
                key={stage.step}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.4 }}
                className="pipeline-stage"
                onClick={() => setActiveStage(activeStage === stage.step ? null : stage.step)}
                style={{
                  padding: "1.1rem 0.9rem",
                  textAlign: "center",
                  borderColor: activeStage === stage.step ? stage.accent : undefined,
                  boxShadow: activeStage === stage.step ? `0 0 0 1px ${stage.accent}44, 0 8px 32px ${stage.accent}22` : undefined,
                  opacity: stage.comingSoon ? 0.6 : 1,
                  position: "relative",
                }}
              >
                {stage.comingSoon && (
                  <span style={{
                    position: "absolute", top: 6, right: 6, fontSize: "0.55rem", fontWeight: 700,
                    background: "#64748b22", color: "#64748b", borderRadius: 4, padding: "1px 5px",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    Soon
                  </span>
                )}

                {/* Tinted icon tile */}
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
              </motion.div>
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
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${active.accent}40`,
                  borderRadius: 16,
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
                    href={active.liveLink}
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
