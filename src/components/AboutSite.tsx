import Link from "next/link";

/** Public "About" — about the WEBSITE, not the owner. The personal portfolio
 * (bio, skills, career, contact) is private now; this page tells any visitor what
 * AIRaML is, what it offers, and how it treats their data. No personal info. */

const DOMAINS = [
  { h: "AutoML & tabular ML", p: "End-to-end pipelines — clean, train, compare models, explain predictions (SHAP), and export." },
  { h: "Computer vision", p: "Object detection, pose, depth, image forensics, PPE/scene checks — many run fully in the browser." },
  { h: "Document intelligence & RAG", p: "Ask questions across PDFs, images and video; multimodal retrieval with citations you can click back to." },
  { h: "Security & threat analysis", p: "Malware/YARA scanning, phishing & QR checks, prompt-injection playground, TLS/header audits and more." },
  { h: "Data & EDA", p: "Exploratory analysis, anomaly detection, drift, charts and reports over your own data." },
  { h: "Text, audio & video", p: "Text-to-SQL, text-to-image, meeting intelligence, keystroke/gait analysis and other media tools." },
];

const PLATFORMS = [
  { h: "ML Unified", p: "The shared ML/AI backend powering the tools." },
  { h: "EDA", p: "A full exploratory-data-analysis application." },
  { h: "Vision", p: "A computer-vision application and model host." },
  { h: "Testwright", p: "A QA / test-authoring and self-healing platform." },
  { h: "Text-to-SQL", p: "Natural-language questions turned into SQL over a database." },
];

const SECTIONS = [
  {
    h: "What AIRaML is",
    p: "AIRaML is a free collection of 50+ machine-learning and security tools that run in your browser. Each is a focused, self-contained tool with a guided walkthrough — pick one, feed it an input (or load a sample), and get a result, with no setup and no account for the public tools.",
  },
  {
    h: "How it works",
    p: "A Next.js front end talks to a set of Python (FastAPI) ML services. Lightweight demos run entirely on your device; heavier models run on hosted inference services. Everything is designed to work on free and low-cost tiers, so the tools stay open to everyone — the trade-off is that a sleeping service may take 20–30 seconds to wake on the first request.",
  },
  {
    h: "Your privacy",
    p: "Analytics are content-free — the site records which tools are used, never what you type or upload. Files you submit are scanned for safety, used for your request, and discarded (never written to long-term storage). Secrets stay server-side. There is nothing to install and, for the public tools, nothing to sign up for.",
  },
  {
    h: "Built to be safe",
    p: "Every upload passes a malware gate (fast signature rules plus a full ClamAV antivirus scan), size and decompression-bomb limits, and model-loading safeguards that never execute uploaded files. Rate limits, per-origin controls and spend budgets protect the services. The goal is a showcase you can trust to run real files.",
  },
];

function Card({ h, p }: { h: string; p: string }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: 20 }}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 17, margin: "0 0 7px", color: "var(--text)" }}>{h}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)", margin: 0 }}>{p}</p>
    </div>
  );
}

export default function AboutSite() {
  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "96px 20px 56px" }}>
      <p style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 10px" }}>
        About the platform
      </p>
      <h1 style={{ fontFamily: "var(--type-display)", fontSize: 36, lineHeight: 1.12, margin: "0 0 16px", color: "var(--text)", textWrap: "balance" }}>
        Fifty machine-learning tools, free and in your browser
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--text2)", margin: "0 0 44px", maxWidth: 680 }}>
        AIRaML turns a broad range of machine-learning and security techniques into
        tools anyone can run — no setup, no accounts, no cost. This page explains what
        the platform offers, how it&apos;s built, and how it treats your data.
      </p>

      {/* The platform, how it works, privacy, security */}
      <div style={{ display: "grid", gap: 16, marginBottom: 48 }}>
        {SECTIONS.map((s) => <Card key={s.h} {...s} />)}
      </div>

      {/* What you can do */}
      <h2 style={{ fontFamily: "var(--type-display)", fontSize: 24, margin: "0 0 6px", color: "var(--text)" }}>
        What you can do
      </h2>
      <p style={{ fontSize: 15, color: "var(--text2)", margin: "0 0 20px", maxWidth: 680 }}>
        The tools span six broad areas — browse the full set on the home page.
      </p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginBottom: 48 }}>
        {DOMAINS.map((d) => <Card key={d.h} {...d} />)}
      </div>

      {/* Platforms */}
      <h2 style={{ fontFamily: "var(--type-display)", fontSize: 24, margin: "0 0 6px", color: "var(--text)" }}>
        The platforms behind it
      </h2>
      <p style={{ fontSize: 15, color: "var(--text2)", margin: "0 0 20px", maxWidth: 680 }}>
        Beyond the individual tools, AIRaML includes several larger applications.
      </p>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginBottom: 48 }}>
        {PLATFORMS.map((p) => <Card key={p.h} {...p} />)}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/#capabilities"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 9999, background: "var(--brand-gradient)", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          Explore the tools
        </Link>
        <Link
          href="/handbook"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 9999, background: "transparent", color: "var(--text)", border: "1px solid var(--border2)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          Read the handbook
        </Link>
      </div>
    </section>
  );
}
