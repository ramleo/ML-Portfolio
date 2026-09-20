"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import { ML_ACCENT, ML_ACCENT2, APP_HREF } from "./theme";
import { ML_WORLD_GUIDE, ML_WORLD_SUGGESTIONS } from "./guide";
import MlCapabilities from "./sections/MlCapabilities";
import MlHowScope from "./sections/MlHowScope";

const GRAD = `linear-gradient(120deg, ${ML_ACCENT}, ${ML_ACCENT2})`;

const TOOL_SUMMARY =
  "ML Unified is a tabular-prediction platform inside AIRaML — four trained models (Iris species, " +
  "Titanic survival, Diabetes risk, Insurance premium) served from one schema-driven FastAPI backend. " +
  "Pick a model, fill a form built automatically from its feature schema, and get a live prediction " +
  "with class probabilities or a predicted value. Free.";

const LaunchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function MlLandingPage() {
  useToolTracking("ml-world");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="pb-16">
      <ToolsAIChat context={{
        accent: ML_ACCENT,
        tool: "ML Unified",
        summary: TOOL_SUMMARY,
        guide: ML_WORLD_GUIDE,
        suggestions: ML_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="ML Unified" accent={ML_ACCENT} guide={ML_WORLD_GUIDE} />

      {/* HERO */}
      <header className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--text3)" }}>
          Platform · ML Unified
        </p>
        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(2rem,5vw,3.2rem)" }}>
          Four trained models.{" "}
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>One app.</span>
          <br />Fill a form, get a prediction.
        </h1>
        <p className="text-[15px] leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text2)" }}>
          ML Unified is a tabular-prediction world inside AIRaML. Pick one of four models, fill a form
          the app builds automatically from that model&apos;s schema, and get a live prediction — with
          class probabilities or a predicted value — all from one schema-driven FastAPI backend.
        </p>
        <div className="flex gap-2.5 flex-wrap mt-6">
          <a href={APP_HREF} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ background: GRAD, color: "#fff" }}>
            Open the platform
            <LaunchIcon />
          </a>
          <a href="#how" className="inline-flex items-center font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
            See how it works
          </a>
          <button onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: `1px solid ${ML_ACCENT}45`, color: ML_ACCENT, background: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Guide
          </button>
        </div>
        <div className="flex gap-4 flex-wrap mt-5 text-[13px]" style={{ color: "var(--text3)" }}>
          {["Schema-driven forms", "3 classifiers · 1 regressor", "Live predictions", "Free to use"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ML_ACCENT }} />{t}
            </span>
          ))}
        </div>

        {/* Signature predict panel */}
        <div className="qa-xlate grid mt-9 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: "1fr auto 1fr", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-soft, var(--bg-card))" }}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>You enter — Titanic Survival</h4>
            <dl className="text-[13px] leading-relaxed m-0" style={{ color: "var(--text)" }}>
              {[["Passenger class", "3"], ["Sex", "female"], ["Age", "28"], ["Fare", "£7.90"], ["Siblings / spouse", "0"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-0.5">
                  <dt style={{ color: "var(--text3)" }}>{k}</dt>
                  <dd className="m-0 font-medium" style={{ color: "var(--text)" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid place-items-center px-1.5" style={{ background: "var(--bg-soft, var(--bg-card))", borderInline: "1px solid var(--border)", color: ML_ACCENT2 }}>
            <svg className="qa-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="p-4 min-w-0 flex flex-col justify-center">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>The model predicts</h4>
            <p className="text-2xl font-extrabold tracking-tight" style={{ color: ML_ACCENT }}>Survived</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>71% confidence · Gradient Boosting</p>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: "71%", background: GRAD }} />
            </div>
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--text3)" }}>
          An illustrative example. The model is trained on the real Titanic dataset (82.5% held-out
          accuracy) — a demo, not advice.
        </p>
      </header>

      <MlCapabilities />
      <MlHowScope />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(120deg, ${ML_ACCENT}14, transparent)`, border: `1px solid ${ML_ACCENT}30` }}>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Make your first prediction.</h2>
          <p className="text-[15px] mt-2.5 mb-5 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            Pick a model, fill the form, and see the prediction — no setup, free.
          </p>
          <a href={APP_HREF} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full mx-auto" style={{ background: GRAD, color: "#fff" }}>
            Open the platform
            <LaunchIcon />
          </a>
        </div>
      </section>

      <style>{`
        @media (max-width: 760px){
          .qa-xlate { grid-template-columns: 1fr !important; }
          .qa-xlate .qa-arrow { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}
