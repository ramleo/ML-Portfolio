import Link from "next/link";

/** Public "About" — about the WEBSITE, not the owner. The personal portfolio
 * (bio, skills, career, contact) is private now; this page tells any visitor what
 * AIRaML is, what it offers, and how it treats their data. No personal info. */
export default function AboutSite() {
  const sections = [
    {
      h: "What AIRaML is",
      p: "AIRaML is a free collection of 50+ machine-learning and security tools that run in your browser. AutoML pipelines, computer vision, document intelligence, retrieval-augmented search and security analysis — each as a focused, self-contained tool with a guided walkthrough.",
    },
    {
      h: "How it works",
      p: "A Next.js front end talks to a set of Python (FastAPI) ML services. Lightweight demos run entirely on your device; heavier models run on hosted inference services. Everything is designed to work on free and low-cost tiers, so the tools stay open to everyone.",
    },
    {
      h: "Your privacy",
      p: "Analytics are content-free — the site records which tools are used, never what you type or upload. Files you submit are scanned for safety, used for your request, and discarded. Secrets stay server-side. There is nothing to install and, for the public tools, nothing to sign up for.",
    },
    {
      h: "Built to be safe",
      p: "Every upload passes a malware gate (signature + full antivirus scan), size and decompression-bomb limits, and model-loading safeguards. Rate limits and per-origin controls protect the services. The goal is a showcase you can trust to run real files.",
    },
  ];

  return (
    <section style={{ maxWidth: 820, margin: "0 auto", padding: "96px 20px 48px" }}>
      <p style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 10px" }}>
        About the platform
      </p>
      <h1 style={{ fontFamily: "var(--type-display)", fontSize: 34, lineHeight: 1.15, margin: "0 0 14px", color: "var(--text)", textWrap: "balance" }}>
        Fifty machine-learning tools, free and in your browser
      </h1>
      <p style={{ fontSize: 16, color: "var(--text2)", margin: "0 0 36px", maxWidth: 640 }}>
        AIRaML turns a broad range of ML and security techniques into tools anyone
        can run — no setup, no accounts, no cost.
      </p>

      <div style={{ display: "grid", gap: 20 }}>
        {sections.map((s) => (
          <div
            key={s.h}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border2)",
              borderRadius: "var(--radius-card)",
              padding: 22,
            }}
          >
            <h2 style={{ fontFamily: "var(--type-display)", fontSize: 19, margin: "0 0 8px", color: "var(--text)" }}>
              {s.h}
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text2)", margin: 0 }}>
              {s.p}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <Link
          href="/#capabilities"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 9999,
            background: "var(--brand-gradient)", color: "#fff",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          Explore the tools
        </Link>
      </div>
    </section>
  );
}
