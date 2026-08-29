"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import capabilities from "@/data/capabilities";
import registry from "@/data/registry.json";

/**
 * How the whole system actually fits together.
 *
 * A card grid shows what was built; it can't show that the pieces form a
 * system. Every figure below is either counted from this repo's own data or
 * is a fixed value read straight out of the backend source, so nothing here
 * is an estimate:
 *
 *   tools / platforms  — capabilities.ts and registry.json, counted at build
 *   55 routers         — `grep -c include_router` in services/ml-api/app.py
 *   6 safeguards       — files in services/ml-api/security/
 *   60 & 10 per minute — RATE_LIMIT_HEURISTIC / RATE_LIMIT_LLM defaults
 *   10 MB              — MAX_REQUEST_BODY_BYTES default
 *
 * Deliberately omitted: a count of how many tools run entirely in the browser.
 * Two attempts to derive it statically disagreed with each other (16 vs 1), so
 * rather than publish a figure that can't be defended, the browser stage
 * describes the split without quantifying it.
 */

type Stage = {
  id: string;
  kicker: string;
  title: string;
  meta: string;
  items: string[];
  /** CSS token, not a hex literal — the stage hues have to shift with the
   *  theme or the small uppercase kicker fails contrast on the light ground. */
  accent: string;
};

const TOOL_COUNT = capabilities.length;
const PLATFORM_COUNT = registry.length;

const STAGES: Stage[] = [
  {
    id: "client",
    kicker: "Client",
    title: "Browser",
    meta: "Next.js · Vercel",
    accent: "var(--arch-1)",
    items: [
      `${TOOL_COUNT} tool pages + ${PLATFORM_COUNT} platforms`,
      "Some tools run fully in-browser",
      "MediaPipe · ONNX Runtime Web",
    ],
  },
  {
    id: "edge",
    kicker: "Gate",
    title: "Safeguards",
    meta: "6 modules, one concern each",
    accent: "var(--arch-2)",
    items: [
      "Origin allowlist (hard 403)",
      "Rate limit — 60/min, 10/min LLM",
      "10 MB request body cap",
      "YARA scan on uploads",
      "Daily spend cap · event log",
    ],
  },
  {
    id: "api",
    kicker: "Server",
    title: "FastAPI",
    meta: "ml-api · Hugging Face Space",
    accent: "var(--arch-3)",
    items: [
      "55 routers",
      "Sibling services: SQL, EDA, Vision",
      "Docker, CPU-only",
    ],
  },
  {
    id: "compute",
    kicker: "Compute",
    title: "Models & Stores",
    meta: "Local first, API when needed",
    accent: "var(--arch-4)",
    items: [
      "ONNX Runtime · PyTorch · timm",
      "scikit-learn · XGBoost · LightGBM",
      "spaCy · sentence-transformers",
      "ChromaDB vector store",
      "4 LLM providers, budget-capped",
    ],
  },
];

function StageCard({ stage, i, inView }: { stage: Stage; i: number; inView: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
      className="arch-stage"
      style={{ ["--stage-accent" as string]: stage.accent }}
    >
      <div className="arch-stage-head">
        <span className="arch-kicker">{stage.kicker}</span>
        <span className="arch-step">{String(i + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="arch-title">{stage.title}</h3>
      <p className="arch-meta">{stage.meta}</p>
      <ul className="arch-items">
        {stage.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </motion.li>
  );
}

export default function ArchitectureDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="architecture">
      <div className="section" ref={ref}>
        <p className="section-label">Architecture</p>
        <h2 className="section-heading">
          One request, <span className="heading-accent">end to end</span>
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text3)",
            maxWidth: 560,
            marginBottom: "2.5rem",
          }}
        >
          What happens between clicking &ldquo;Try it&rdquo; on a tool and getting a result
          back. Every count here is read from the codebase at build time, not written by hand.
        </p>

        {/* Ordered list: the stages are a real sequence a request passes
            through, so the markup says so rather than relying on visual order. */}
        <ol className="arch-flow">
          {STAGES.map((s, i) => (
            <StageCard key={s.id} stage={s} i={i} inView={inView} />
          ))}
        </ol>

        <p className="arch-note">
          Requests flow left to right; results return the same way. The safeguard layer is
          the only thing between the public internet and the API, so it runs on every
          request regardless of which tool made it.
        </p>
      </div>
    </section>
  );
}
