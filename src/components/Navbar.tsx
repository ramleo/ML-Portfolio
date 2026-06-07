"use client";

import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { label: "About",    href: "#about" },
  { label: "Skills",   href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "News",     href: "#news" },
  { label: "Timeline", href: "#timeline" },
  { label: "Contact",  href: "#contact" },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        background: scrolled ? "var(--bg-nav)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        padding: "0 1.5rem",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      {/* Logo */}
      <a href="#" style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", textDecoration: "none", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #818cf8, #38bdf8, #34d399)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          AI
        </span>
        <span className="gradient-text">AIRaML</span>
      </a>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

        {/* Desktop nav links — hidden on mobile via CSS */}
        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{ fontSize: "0.82rem", color: "var(--text2)", textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/Resume_W_Ramakrishnasai.pdf"
            download
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.9rem", borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #38bdf8)", color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", transition: "opacity 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Resume
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 1v7M2 9l4 2 4-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Theme toggle — always visible on both desktop and mobile */}
        <ThemeToggle />

        {/* Hamburger — visible only on mobile via CSS */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="nav-hamburger"
          style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 4, lineHeight: 0 }}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              : <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown — nav links + resume */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: 60, left: 0, right: 0,
          background: "var(--bg-nav)", backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          padding: "1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0",
        }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: "0.95rem", color: "var(--text2)", textDecoration: "none",
                fontWeight: 500, padding: "0.65rem 0",
                borderBottom: "1px solid var(--border)",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
            >
              {link.label}
            </a>
          ))}
          {/* Resume in dropdown */}
          <a
            href="/Resume_W_Ramakrishnasai.pdf"
            download
            onClick={() => setMenuOpen(false)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              marginTop: "1rem",
              padding: "0.55rem 1.25rem", borderRadius: 9999,
              background: "linear-gradient(135deg, #6366f1, #38bdf8)",
              color: "#fff", fontSize: "0.85rem", fontWeight: 600,
              textDecoration: "none", alignSelf: "flex-start",
            }}
          >
            Resume
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 1v7M2 9l4 2 4-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}
    </nav>
  );
}
