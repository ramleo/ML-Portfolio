"use client";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "var(--bg-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Logo */}
      <a
        href="#"
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color: "var(--text)",
          textDecoration: "none",
          letterSpacing: "-0.02em",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, #818cf8, #38bdf8)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 800,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          ML
        </span>
        <span>Portfolio</span>
      </a>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <a
          href="#projects"
          style={{
            fontSize: "0.875rem",
            color: "var(--text2)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
        >
          Projects
        </a>
        <a
          href="#about"
          style={{
            fontSize: "0.875rem",
            color: "var(--text2)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
        >
          About
        </a>
        <a
          href="https://github.com/ramleo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.875rem",
            color: "var(--text2)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <ThemeToggle />
      </div>
    </nav>
  );
}