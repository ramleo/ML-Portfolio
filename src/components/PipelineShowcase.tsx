"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const STAGES = [
  {
    step: 1, title: "Data Ingestion", icon: "📥", accent: "#34d399",
    tools: ["CSV Upload", "REST APIs", "Web Scraping", "Selenium", "Scrapy", "BeautifulSoup"],
    description: "Collect raw data from any source — upload CSV files, call REST APIs, or scrape websites with Selenium, Scrapy, or BeautifulSoup. This is where every ML project begins.",
    liveLink: "https://ml-unified.onrender.com/?mode=eda",
    liveLinkLabel: "Try EDA Explorer →",
  },
  {
    step: 2, title: "Exploratory Analysis", icon: "🔍", accent: "#38bdf8",
    tools: ["Pandas", "NumPy", "Plotly", "Distributions", "Correlations", "Outliers"],
    description: "Understand the data before touching it. Distributions, missing values, correlations, outlier detection, type inference — visualized interactively.",
    liveLink: "https://ml-unified.onrender.com/?mode=eda",
    liveLinkLabel: "Open EDA Explorer →",
  },
  {
    step: 3, title: "Feature Engineering", icon: "⚙️", accent: "#a78bfa",
    tools: ["Encoding", "Scaling", "PCA", "LDA", "SHAP", "Feature Selection", "SMOTE", "ADASYN"],
    description: "Clean, encode, scale, and select features. Reduce dimensionality with PCA/LDA. Handle class imbalance with SMOTE and ADASYN. Identify important features with SHAP.",
    liveLink: null, liveLinkLabel: null,
  },
  {
    step: 4, title: "Model Training", icon: "🧠", accent: "#f59e0b",
    tools: ["Scikit-learn", "XGBoost", "LightGBM", "CatBoost", "PyTorch", "GridSearchCV", "Auto-ML"],
    description: "Select and train the right algorithm — from Linear Regression and Random Forest to XGBoost, deep learning (CNN/RNN), and Auto-ML pipelines with hyperparameter tuning.",
    liveLink: "https://ml-unified.onrender.com/?mode=ml",
    liveLinkLabel: "Try ML Platform →",
  },
  {
    step: 5, title: "Evaluation", icon: "📊", accent: "#f87171",
    tools: ["Accuracy", "AUC-ROC", "Confusion Matrix", "Precision", "Recall", "F-Beta", "SHAP", "LIME"],
    description: "Measure model performance with the right metrics for the task. Interpret black-box predictions with SHAP and LIME. Validate on held-out data.",
    liveLink: "https://ml-unified.onrender.com/?mode=ml",
    liveLinkLabel: "See Live Results →",
  },
  {
    step: 6, title: "Deployment", icon: "🚀", accent: "#818cf8",
    tools: ["FastAPI", "Flask", "Docker", "Render", "Vercel", "GCP", "Postman"],
    description: "Serve predictions via REST API with FastAPI or Flask. Containerize with Docker. Deploy to Render (ML backends) or Vercel (frontends). Every app here is live.",
    liveLink: "https://ml-unified.onrender.com/?mode=vision",
    liveLinkLabel: "Try Vision Platform →",
  },
  {
    step: 7, title: "Monitoring", icon: "📡", accent: "#64748b",
    tools: ["MLFlow", "Data Drift", "Model Drift", "Dashboards", "Alerts"],
    description: "Track model performance over time, detect data drift and concept drift, log experiments with MLFlow, and trigger retraining pipelines when performance degrades.",
    liveLink: null,
    liveLinkLabel: "Coming Soon",
    comingSoon: true,
  },
];

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
                <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{stage.icon}</div>
                <div
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: `${stage.accent}20`, border: `1px solid ${stage.accent}50`,
                    color: stage.accent, fontSize: "0.65rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 0.5rem",
                  }}
                >
                  {stage.step}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                  {stage.title}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Flow arrows hint */}
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
                  <span style={{ fontSize: "1.75rem" }}>{active.icon}</span>
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
