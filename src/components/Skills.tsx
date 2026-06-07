"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

function SkillIcon({ id, accent, size = 18 }: { id: string; accent: string; size?: number }) {
  const p = {
    viewBox: "0 0 24 24", width: size, height: size,
    fill: "none" as const, stroke: accent, strokeWidth: 1.75,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "ml": return (
      <svg {...p}>
        <circle cx="12" cy="4"  r="2" fill={accent} fillOpacity={0.18} />
        <circle cx="4"  cy="19" r="2" fill={accent} fillOpacity={0.18} />
        <circle cx="20" cy="19" r="2" fill={accent} fillOpacity={0.18} />
        <line x1="12" y1="6"  x2="5"  y2="17" />
        <line x1="12" y1="6"  x2="19" y2="17" />
        <line x1="6"  y1="19" x2="18" y2="19" />
      </svg>
    );
    case "dl": return (
      <svg {...p}>
        <polyline points="13 2 7 13 12 13 11 22 17 11 12 11 13 2" fill={accent} fillOpacity={0.12} />
      </svg>
    );
    case "genai": return (
      <svg {...p}>
        <path d="M12 2L14 9.5L22 12L14 14.5L12 22L10 14.5L2 12L10 9.5L12 2Z" fill={accent} fillOpacity={0.15} />
      </svg>
    );
    case "nlp": return (
      <svg {...p}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={accent} fillOpacity={0.12} />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="13" x2="13" y2="13" />
      </svg>
    );
    case "cv": return (
      <svg {...p}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill={accent} fillOpacity={0.08} />
        <circle cx="12" cy="12" r="3" fill={accent} fillOpacity={0.22} />
      </svg>
    );
    case "mlops": return (
      <svg {...p}>
        <circle cx="12" cy="12" r="3" fill={accent} fillOpacity={0.2} />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
    default: return null;
  }
}

const CATEGORIES = [
  {
    id: "ml",
    title: "Machine Learning",
    accent: "#818cf8",
    skills: [
      "Linear Regression", "Logistic Regression", "Random Forest", "XGBoost",
      "LightGBM", "CatBoost", "Decision Trees", "SVM", "KNN",
      "K-Means", "Hierarchical Clustering", "SMOTE", "ADASYN",
      "GridSearchCV", "RandomSearchCV", "SHAP", "LIME",
    ],
  },
  {
    id: "dl",
    title: "Deep Learning",
    accent: "#a78bfa",
    skills: [
      "ANN", "CNN", "RNN", "LSTM", "Transfer Learning",
      "VGG16", "VGG19", "ResNet50", "MobileNet", "GoogLeNet",
      "SegFormer-B0", "Data Augmentation", "CNN Visualization",
    ],
  },
  {
    id: "genai",
    title: "Generative AI",
    accent: "#f59e0b",
    skills: [
      "Transformers", "RAG", "AI Agents", "LangChain", "LangGraph",
      "LLMs", "Prompt Engineering", "Vector Databases", "Embeddings",
    ],
  },
  {
    id: "nlp",
    title: "NLP",
    accent: "#34d399",
    skills: [
      "Word2Vec", "LSTM", "Topic Modeling", "Sentiment Analysis",
      "POS Tagging", "Lemmatization", "Stemming", "Text Preprocessing",
      "Gensim", "GaussianNB", "TF-IDF",
    ],
  },
  {
    id: "cv",
    title: "Computer Vision",
    accent: "#38bdf8",
    skills: [
      "Image Classification", "Object Detection", "Semantic Segmentation",
      "ONNX", "TinyYOLOv3", "Custom CNN", "CNN Layer Visualization",
      "Image Augmentation", "Web Image Extraction",
    ],
  },
  {
    id: "mlops",
    title: "MLOps & Tools",
    accent: "#f87171",
    skills: [
      "Python", "FastAPI", "Flask", "Docker", "GCP",
      "Render", "Vercel", "Heroku", "Postman",
      "MLFlow", "Scikit-learn", "Pandas", "NumPy",
      "Plotly", "SQL", "Git", "Selenium", "Scrapy", "BeautifulSoup",
    ],
  },
];

type Category = typeof CATEGORIES[number];

function SkillCard({ cat, ci, inView }: { cat: Category; ci: number; inView: boolean }) {
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
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.15 + ci * 0.09, duration: 0.45 }}
      style={{ height: "100%" }}
    >
    <div
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setTilt({ x: 0, y: 0 }); }}
      style={{
        height: "100%",
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--glass-bg)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${hovering ? cat.accent + "44" : "var(--glass-border)"}`,
        transform: hovering
          ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: hovering
          ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
          : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
        boxShadow: hovering
          ? `0 0 0 1px ${cat.accent}33, 0 20px 60px ${cat.accent}18, 0 8px 24px rgba(0,0,0,0.3)`
          : "var(--glass-shadow)",
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
        }}
      />

      {/* Accent top bar */}
      <div style={{ height: 3, background: cat.accent, position: "relative", zIndex: 1 }} />

      <div style={{ padding: "1.25rem 1.25rem 1.5rem", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1rem" }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${cat.accent}20`, border: `1px solid ${cat.accent}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SkillIcon id={cat.id} accent={cat.accent} size={18} />
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{cat.title}</span>
        </div>

        {/* Skill chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {cat.skills.map((skill, si) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 + ci * 0.06 + si * 0.02, duration: 0.25 }}
              className="skill-chip"
              style={{
                background: `${cat.accent}12`,
                color: cat.accent,
                borderColor: `${cat.accent}35`,
              }}
            >
              {skill}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
    </motion.div>
  );
}

const fade = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Skills() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="skills" style={{ background: "var(--bg-section)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p className="section-label" variants={fade}>Skills</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            The full <span className="gradient-text">AI/ML stack</span>
          </motion.h2>
          <motion.p
            variants={fade}
            style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 540, marginBottom: "3rem" }}
          >
            End-to-end capabilities — from raw data through classical ML, deep learning, NLP, computer vision, and Generative AI to production deployment.
          </motion.p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: "1.25rem" }}>
            {CATEGORIES.map((cat, ci) => (
              <SkillCard key={cat.title} cat={cat} ci={ci} inView={inView} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
