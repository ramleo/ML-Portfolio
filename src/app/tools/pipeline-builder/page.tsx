"use client";

import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import PipelineCard from "@/components/PipelineCard";
import { PipelineProvider, usePipeline } from "@/context/PipelineContext";
import { cardDeps, emptyPipelineState, type MLPipelineState } from "@/types/pipeline";

// ── Card definitions ──────────────────────────────────────────────────────────

const S = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ICONS = {
  preprocessing: <svg {...S} viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M10 18h4"/></svg>,
  featureeng:    <svg {...S} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  featureselect: <svg {...S} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/></svg>,
  automl:        <svg {...S} viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg>,
  optuna:        <svg {...S} viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>,
  shap:          <svg {...S} viewBox="0 0 24 24"><rect x="3" y="14" width="4" height="7" rx="1"/><rect x="9.5" y="9" width="4" height="12" rx="1"/><rect x="16" y="4" width="4" height="17" rx="1"/></svg>,
  ensemble:      <svg {...S} viewBox="0 0 24 24"><path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"/></svg>,
};

const CARDS = [
  { id: "preprocessing",  title: "Preprocessing",       accent: "#38bdf8", href: "/tools/preprocessing",       description: "Impute missing values, remove duplicates, encode categoricals, handle outliers." },
  { id: "featureeng",     title: "Feature Engineering", accent: "#f59e0b", href: "/tools/feature-engineering", description: "Create new features: log transforms, binning, polynomial, date extraction, ratios." },
  { id: "featureselect",  title: "Feature Selection",   accent: "#34d399", href: "/tools/feature-selection",   description: "Select top features via variance, correlation, RFE, SelectKBest, Lasso, or PCA." },
  { id: "automl",         title: "AutoML",              accent: "#22c55e", href: "/tools/automl",              description: "Run a 5-fold CV competition across RF, XGBoost, LightGBM, CatBoost and more." },
  { id: "optuna",         title: "Optuna Tuning",       accent: "#a78bfa", href: "/tools/optuna",             description: "Bayesian hyperparameter search on the AutoML winner. Up to 200 trials." },
  { id: "shap",           title: "SHAP Explainability", accent: "#f87171", href: "/tools/shap",               description: "Explain predictions with SHAP importance bars per feature." },
  { id: "ensemble",       title: "Ensemble",            accent: "#818cf8", href: "/tools/ensemble",           description: "Combine top models via Voting or Stacking for maximum accuracy." },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(id: string, state: MLPipelineState): "locked" | "ready" | "done" {
  const dep = cardDeps[id as keyof typeof cardDeps];
  const isLocked = !dep.standalone && dep.requires.some((k) => state[k] == null);
  if (isLocked) return "locked";

  const doneMap: Record<string, boolean> = {
    preprocessing:  state.preprocessingConfig != null,
    featureeng:     state.transforms.length > 0,
    featureselect:  state.featureSelectionConfig != null,
    automl:         state.automlWinner != null,
    optuna:         state.tunedModel != null,
    shap:           state.shapValues != null,
    ensemble:       state.ensembleType != null,
  };
  return doneMap[id] ? "done" : "ready";
}

function getMetric(id: string, state: MLPipelineState): string | null {
  if (id === "automl" && state.automlWinner)
    return `Winner: ${state.automlWinner.algo} · ${state.automlWinner.score.toFixed(3)}`;
  if (id === "optuna" && state.tunedModel)
    return `Tuned: ${state.tunedModel.algo} · ${state.tunedModel.score.toFixed(3)}`;
  if (id === "shap" && state.shapValues)
    return `${Object.keys(state.shapValues).length} features explained`;
  if (id === "ensemble" && state.ensembleScore != null)
    return `${state.ensembleType} · score ${state.ensembleScore.toFixed(3)}`;
  if (id === "preprocessing" && state.preprocessingConfig)
    return "Config saved";
  if (id === "featureeng" && state.transforms.length > 0)
    return `${state.transforms.length} transform${state.transforms.length > 1 ? "s" : ""} applied`;
  if (id === "featureselect" && state.featureSelectionConfig)
    return `${state.selectedFeatures.length || "?"} features selected`;
  return null;
}

// ── Inner page (has access to usePipeline) ────────────────────────────────────

function PipelineBuilderInner() {
  const { state, setState } = usePipeline();

  const doneCount = CARDS.filter((c) => getStatus(c.id, state) === "done").length;
  const progressPct = Math.round((doneCount / CARDS.length) * 100);

  function handleReset() {
    setState(emptyPipelineState);
    try { localStorage.removeItem("ml_pipeline_state"); } catch { /* noop */ }
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "inherit" }}>
      <ConstellationBackground />

      {/* ── Sticky header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.75rem 1.5rem",
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "0.82rem",
            color: "var(--text3, rgba(180,185,210,0.75))",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          ← Portfolio
        </Link>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.9rem" }}>|</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
          ML Pipeline Builder
        </span>
      </header>

      {/* ── Hero section ── */}
      <section
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "2.5rem 1.5rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.7rem",
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Build Your ML Pipeline
          </h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text2, rgba(200,205,225,0.85))",
              marginTop: "0.45rem",
              lineHeight: 1.5,
            }}
          >
            Complete each stage in sequence. Results flow automatically to the next step.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text3, rgba(180,185,210,0.75))", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Progress
            </span>
            <span style={{ fontSize: "0.72rem", color: "#4ade80", fontWeight: 600 }}>
              {doneCount} / {CARDS.length} stages complete
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 99,
              background: "rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 99,
                background: "linear-gradient(90deg, #22c55e, #4ade80)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* Reset button */}
        <div>
          <button
            onClick={handleReset}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "rgba(248,113,113,0.8)",
              background: "transparent",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 7,
              padding: "0.35rem 0.9rem",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            Reset Pipeline
          </button>
        </div>
      </section>

      {/* ── Cards grid ── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0.5rem 1.5rem 4rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
          justifyItems: "center",
        }}
      >
        {CARDS.map((card) => {
          const status = getStatus(card.id, state);
          const metric = getMetric(card.id, state);
          return (
            <PipelineCard
              key={card.id}
              id={card.id}
              title={card.title}
              description={card.description}
              icon={ICONS[card.id as keyof typeof ICONS]}
              accent={card.accent}
              href={card.href}
              status={status}
              metric={metric}
            />
          );
        })}
      </section>
    </div>
  );
}

// ── Default export wrapped in PipelineProvider ────────────────────────────────

export default function PipelineBuilderPage() {
  return (
    <PipelineProvider>
      <PipelineBuilderInner />
    </PipelineProvider>
  );
}
