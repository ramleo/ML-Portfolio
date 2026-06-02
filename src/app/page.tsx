import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProjectCard from "@/components/ProjectCard";
import About from "@/components/About";
import registry from "@/data/registry.json";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />

      {/* Projects section */}
      <section
        id="projects"
        style={{
          padding: "5rem 1.5rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Section header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "0.5rem",
            }}
          >
            Projects
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
            Live ML Apps —{" "}
            <span className="gradient-text">click to predict</span>
          </h2>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {registry.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--text3)",
            marginTop: "1.5rem",
            textAlign: "center",
          }}
        >
          All projects are hosted on Render free tier — first load may take ~15s to spin up.
        </p>
      </section>

      <About />

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "1.5rem",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "0.8rem",
        }}
      >
        Built with Next.js · Deployed on Vercel · Models trained with Scikit-learn
      </footer>
    </>
  );
}