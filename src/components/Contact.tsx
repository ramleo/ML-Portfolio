"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { SiteIcon, CheckCircleIcon } from "./SiteIcons";
import { getTurnstileToken } from "@/lib/turnstile";

const LINKS = [
  { icon: "in", label: "LinkedIn",  value: "WRamakrishnasai",       href: "https://linkedin.com/in/WRamakrishnasai" },
  { icon: "gh", label: "GitHub",    value: "github.com/ramleo",     href: "https://github.com/ramleo" },
  { icon: "docker",   label: "DockerHub", value: "hub.docker.com/u/wram", href: "https://hub.docker.com/u/wram" },
  { icon: "location", label: "Location",  value: "Hyderabad, India",      href: "#" },
];

const fade = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstile_token: await getTurnstileToken() }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" style={{ background: "var(--bg-section)", padding: "0 0 2rem" }}>
      <div className="section-sep" />
      <div className="section" ref={ref}>

        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
          <motion.p className="section-label" variants={fade}>Contact</motion.p>
          <motion.h2 className="section-heading" variants={fade}>
            Let&apos;s <span className="heading-accent">work together</span>
          </motion.h2>
          <motion.p variants={fade} style={{ fontSize: "0.95rem", color: "var(--text3)", maxWidth: 480, marginBottom: "3rem" }}>
            Open to ML engineering roles, freelance projects, and collaborations. Drop a message or reach out directly.
          </motion.p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "3rem", alignItems: "start" }}>

            {/* Left — links */}
            <motion.div variants={fade} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p className="section-label">Find me on</p>
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="subtle-card"
                  style={{
                    display: "flex", alignItems: "center", gap: "1rem",
                    padding: "0.85rem 1.1rem",
                    textDecoration: "none", color: "var(--text2)",
                    fontSize: "0.85rem",
                    ["--acc-glow" as string]: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text2)"; }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: "var(--radius-sm)",
                    background: "var(--border)", border: "1px solid var(--border2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: "var(--text2)",
                  }}>
                    <SiteIcon id={l.icon} size={15} />
                  </span>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l.label}</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>{l.value}</div>
                  </div>
                </a>
              ))}
            </motion.div>

            {/* Right — form */}
            <motion.div variants={fade}>
              <p className="section-label" style={{ marginBottom: "1.25rem" }}>Send a message</p>

              {status === "sent" ? (
                <div style={{
                  background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)",
                  borderRadius: "var(--radius-card)", padding: "2rem", textAlign: "center",
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}><CheckCircleIcon size={36} /></div>
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>Message sent!</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text2)", marginTop: 4 }}>I&apos;ll get back to you soon.</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.4rem", fontWeight: 500 }}>Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.4rem", fontWeight: 500 }}>Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.4rem", fontWeight: 500 }}>Message</label>
                    <textarea
                      className="form-input"
                      rows={5}
                      placeholder="What would you like to discuss?"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  {status === "error" && (
                    <p style={{ fontSize: "0.82rem", color: "#f87171", margin: 0 }}>
                      Something went wrong. Please email directly at ramleo84@gmail.com
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    style={{
                      padding: "0.75rem 1.75rem",
                      borderRadius: 9999,
                      background: status === "sending" ? "var(--border)" : "linear-gradient(135deg, var(--accent), var(--accent-via))",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      border: "none",
                      cursor: status === "sending" ? "not-allowed" : "pointer",
                      transition: "opacity 0.15s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => { if (status !== "sending") e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    {status === "sending" ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
