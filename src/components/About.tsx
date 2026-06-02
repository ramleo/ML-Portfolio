const TECH_STACK = [
  { category: "Languages", items: ["Python", "TypeScript", "SQL"] },
  { category: "ML / Data", items: ["Scikit-learn", "Pandas", "NumPy", "XGBoost", "LightGBM"] },
  { category: "Backend", items: ["FastAPI", "Uvicorn", "REST APIs"] },
  { category: "Frontend", items: ["Next.js", "React", "Tailwind CSS", "Vanilla JS"] },
  { category: "DevOps", items: ["Docker", "Render", "Vercel", "GitHub Actions"] },
];

export default function About() {
  return (
    <section
      id="about"
      style={{
        padding: "5rem 1.5rem 6rem",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
          About
        </p>
        <h2
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Building ML from scratch
          <br />
          <span className="gradient-text">to production</span>
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Bio */}
        <div>
          <p style={{ fontSize: "0.95rem", color: "var(--text2)", lineHeight: 1.8, marginBottom: "1rem" }}>
            I&apos;m a machine learning engineer focused on building complete, deployable ML systems —
            not just notebooks. Each project here runs a full pipeline: data preprocessing,
            feature engineering, model selection, training, and a REST API served with FastAPI.
          </p>
          <p style={{ fontSize: "0.95rem", color: "var(--text2)", lineHeight: 1.8 }}>
            The frontends are live, interactive, and dark/light themed. The Auto-ML pipeline
            bootstrapper generates new project templates from any CSV dataset in seconds.
          </p>
        </div>

        {/* Tech stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {TECH_STACK.map((group) => (
            <div key={group.category}>
              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text3)",
                  marginBottom: "0.5rem",
                }}
              >
                {group.category}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {group.items.map((item) => (
                  <span key={item} className="tag">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}