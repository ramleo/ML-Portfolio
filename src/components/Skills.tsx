"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

// This section rendered all 84 skill chips at once, which read as an
// undifferentiated wall of keywords rather than a considered summary. Each
// card now shows its first few by default with the rest one click away —
// every skill is still here, just no longer competing for attention at once.
const VISIBLE_SKILLS = 6;

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
  const [showAll, setShowAll] = useState(false);
  const hidden  = cat.skills.length - VISIBLE_SKILLS;
  const shown   = showAll ? cat.skills : cat.skills.slice(0, VISIBLE_SKILLS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.15 + ci * 0.09, duration: 0.45 }}
      style={{ height: "100%" }}
    >
      <div className="subtle-card" style={{ height: "100%", padding: "1.25rem 1.25rem 1.5rem", ["--acc-glow" as string]: `${cat.accent}14` }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "1rem" }}>
          <span className="subtle-dot" style={{ background: cat.accent }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>{cat.title}</span>
        </div>

        {/* Skill chips — capped by default, all of them one click away */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
          {shown.map((skill, si) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{
                // Chips revealed by the toggle animate in immediately; only the
                // initial set is staggered with the card's entrance.
                delay: si < VISIBLE_SKILLS ? 0.2 + ci * 0.06 + si * 0.02 : 0,
                duration: 0.25,
              }}
              className="tag"
            >
              {skill}
            </motion.span>
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="tag"
              style={{
                cursor: "pointer",
                background: "transparent",
                color: cat.accent,
                borderColor: `${cat.accent}55`,
                fontWeight: 600,
              }}
            >
              {showAll ? "Show less" : `+${hidden} more`}
            </button>
          )}
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
