"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SiteIcon } from "./SiteIcons";

const QUICK_LINKS = [
  { label: "About",    href: "#about" },
  { label: "Skills",   href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "News",     href: "#news" },
  { label: "Timeline", href: "#timeline" },
  { label: "Contact",  href: "#contact" },
];

const SOCIALS = [
  { label: "GitHub",    href: "https://github.com/ramleo",               icon: "gh" },
  { label: "LinkedIn",  href: "https://linkedin.com/in/WRamakrishnasai", icon: "in" },
  { label: "DockerHub", href: "https://hub.docker.com/u/wram",           icon: "docker" },
];

export default function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <footer style={{ background: "var(--bg-section)", borderTop: "1px solid var(--border)" }} ref={ref}>
      {/* Top gradient bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #818cf8, #38bdf8, #34d399)" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3.5rem 1.5rem 2rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Main footer grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2.5rem", marginBottom: "3rem" }}>

            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "linear-gradient(135deg, #818cf8, #38bdf8, #34d399)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  AI
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.03em" }} className="gradient-text">
                  AIRaML
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text3)", lineHeight: 1.7, maxWidth: 220 }}>
                Building AI that works — end to end. From raw data to live production APIs.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.75rem" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", display: "inline-block" }} />
                <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>Open to opportunities</span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", marginBottom: "0.9rem" }}>
                Navigate
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {QUICK_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    style={{ fontSize: "0.83rem", color: "var(--text2)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Live Apps */}
            <div>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", marginBottom: "0.9rem" }}>
                Live Apps
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {[
                  { label: "ML Unified Platform", href: "https://ml-unified.onrender.com/?mode=ml" },
                  { label: "EDA Explorer",         href: "https://ml-unified.onrender.com/?mode=eda" },
                  { label: "Vision Platform",      href: "https://ml-unified.onrender.com/?mode=vision" },
                ].map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.83rem", color: "var(--text2)", textDecoration: "none", transition: "color 0.15s", display: "flex", alignItems: "center", gap: "0.3rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
                  >
                    {l.label}
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div>
              <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", marginBottom: "0.9rem" }}>
                Connect
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: "var(--border)", border: "1px solid var(--border2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--text2)", textDecoration: "none",
                      transition: "border-color 0.15s, color 0.15s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--text3)";
                      e.currentTarget.style.color = "var(--text)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border2)";
                      e.currentTarget.style.color = "var(--text2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <SiteIcon id={s.icon} size={15} />
                  </a>
                ))}
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: 0, lineHeight: 1.5 }}>
                Use the contact form to get in touch.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text3)", margin: 0 }}>
              © 2025 Ramakrishnasai Wuppalapati · All rights reserved
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text3)", margin: 0 }}>
              Built with Next.js · Deployed on Vercel · Models on Render
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
