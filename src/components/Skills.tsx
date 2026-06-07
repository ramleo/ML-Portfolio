"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const CATEGORIES = [
  {
    title: "Machine Learning",
    icon: "🧠",
    accent: "#818cf8",
    skills: [
      "Linear Regression", "Logistic Regression", "Random Forest", "XGBoost",
      "LightGBM", "CatBoost", "Decision Trees", "SVM", "KNN",
      "K-Means", "Hierarchical Clustering", "SMOTE", "ADASYN",
      "GridSearchCV", "RandomSearchCV", "SHAP", "LIME",
    ],
  },
  {
    title: "Deep Learning",
    icon: "⚡",
    accent: "#a78bfa",
    skills: [
      "ANN", "CNN", "RNN", "LSTM", "Transfer Learning",
      "VGG16", "VGG19", "ResNet50", "MobileNet", "GoogLeNet",
      "SegFormer-B0", "Data Augmentation", "CNN Visualization",
    ],
  },
  {
    title: "Generative AI",
    icon: "✨",
    accent: "#f59e0b",
    skills: [
      "Transformers", "RAG", "AI Agents", "LangChain", "LangGraph",
      "LLMs", "Prompt Engineering", "Vector Databases", "Embeddings",
    ],
  },
  {
    title: "NLP",
    icon: "💬",
    accent: "#34d399",
    skills: [
      "Word2Vec", "LSTM", "Topic Modeling", "Sentiment Analysis",
      "POS Tagging", "Lemmatization", "Stemming", "Text Preprocessing",
      "Gensim", "GaussianNB", "TF-IDF",
    ],
  },
  {
    title: "Computer Vision",
    icon: "👁",
    accent: "#38bdf8",
    skills: [
      "Image Classification", "Object Detection", "Semantic Segmentation",
      "ONNX", "TinyYOLOv3", "Custom CNN", "CNN Layer Visualization",
      "Image Augmentation", "Web Image Extraction",
    ],
  },
  {
    title: "MLOps & Tools",
    icon: "🛠",
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
        background: "var(--bg-glass)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${hovering ? cat.accent + "44" : "var(--border)"}`,
        transform: hovering
          ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: hovering
          ? "transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease"
          : "transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease, border-color 0.2s ease",
        boxShadow: hovering
          ? `0 0 0 1px ${cat.accent}33, 0 20px 60px ${cat.accent}18, 0 8px 24px rgba(0,0,0,0.3)`
          : "0 4px 24px rgba(0,0,0,0.22)",
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
              fontSize: "1.1rem",
            }}
          >
            {cat.icon}
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
