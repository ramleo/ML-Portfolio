"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import { EDA_ACCENT, EDA_ACCENT2, APP_HREF } from "./theme";
import { EDA_WORLD_GUIDE, EDA_WORLD_SUGGESTIONS } from "./guide";
import EdaCapabilities from "./sections/EdaCapabilities";
import EdaHowScope from "./sections/EdaHowScope";

const GRAD = `linear-gradient(120deg, ${EDA_ACCENT}, ${EDA_ACCENT2})`;

const TOOL_SUMMARY =
  "EDA Explorer is an exploratory-data-analysis platform inside AIRaML — upload any CSV and instantly " +
  "profile it: shape, dtypes, missing values, distributions, descriptive stats, Pearson + " +
  "mutual-information heatmaps, interactive 3D PCA, a scatter-plot matrix, auto-insights, and a " +
  "downloadable PDF/HTML report. No code. Free.";

const LaunchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// A small illustrative histogram for the signature panel.
const BARS = [8, 15, 26, 34, 41, 33, 22, 13, 7];

export default function EdaLandingPage() {
  useToolTracking("eda-world");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="pb-16">
      <ToolsAIChat context={{
        accent: EDA_ACCENT,
        tool: "EDA Explorer",
        summary: TOOL_SUMMARY,
        guide: EDA_WORLD_GUIDE,
        suggestions: EDA_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="EDA Explorer" accent={EDA_ACCENT} guide={EDA_WORLD_GUIDE} />

      {/* HERO */}
      <header className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--text3)" }}>
          Platform · EDA Explorer
        </p>
        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(2rem,5vw,3.2rem)" }}>
          Upload a CSV.{" "}
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Understand it</span>
          <br />in one scroll.
        </h1>
        <p className="text-[15px] leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text2)" }}>
          EDA Explorer is a data-profiling world inside AIRaML. Drop in any CSV and get the whole
          picture — shape, distributions, correlations, mutual information, an interactive 3D PCA and a
          shareable report — with no code, from one FastAPI backend.
        </p>
        <div className="flex gap-2.5 flex-wrap mt-6">
          <a href={APP_HREF} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ background: GRAD, color: "#fff" }}>
            Open the explorer
            <LaunchIcon />
          </a>
          <a href="#how" className="inline-flex items-center font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
            See how it works
          </a>
          <button onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: `1px solid ${EDA_ACCENT}45`, color: EDA_ACCENT, background: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Guide
          </button>
        </div>
        <div className="flex gap-4 flex-wrap mt-5 text-[13px]" style={{ color: "var(--text3)" }}>
          {["No code", "Interactive Plotly", "Correlations · 3D PCA", "PDF / HTML report"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: EDA_ACCENT }} />{t}
            </span>
          ))}
        </div>

        {/* Signature profile panel */}
        <div className="qa-xlate grid mt-9 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: "1fr auto 1fr", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-soft, var(--bg-card))" }}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>You upload</h4>
            <p className="font-mono text-[13px]" style={{ color: "var(--text)" }}>sales.csv</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>1,240 rows × 12 columns</p>
            <p className="text-[12px] leading-relaxed mt-3" style={{ color: "var(--text3)" }}>
              8 numeric · 4 categorical · missing in 3 columns
            </p>
          </div>
          <div className="grid place-items-center px-1.5" style={{ background: "var(--bg-soft, var(--bg-card))", borderInline: "1px solid var(--border)", color: EDA_ACCENT2 }}>
            <svg className="qa-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="p-4 min-w-0 flex flex-col justify-center">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>EDA Explorer profiles</h4>
            <div className="flex items-end gap-[3px] h-16" aria-hidden>
              {BARS.map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h * 2}%`, background: GRAD, opacity: 0.55 + (h / 100) }} />
              ))}
            </div>
            <p className="text-[12px] mt-2" style={{ color: "var(--text2)" }}>
              distribution · strongest correlation <b style={{ color: EDA_ACCENT }}>0.82</b>
            </p>
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--text3)" }}>
          An illustrative profile. Your real upload gets interactive histograms, heatmaps, a 3D PCA and a
          downloadable report.
        </p>
      </header>

      <EdaCapabilities />
      <EdaHowScope />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(120deg, ${EDA_ACCENT}14, transparent)`, border: `1px solid ${EDA_ACCENT}30` }}>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Profile your first dataset.</h2>
          <p className="text-[15px] mt-2.5 mb-5 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            Upload a CSV — or start on the sample — and get the whole picture in one scroll. Free.
          </p>
          <a href={APP_HREF} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full mx-auto" style={{ background: GRAD, color: "#fff" }}>
            Open the explorer
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
