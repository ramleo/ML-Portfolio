"use client";

import { useState } from "react";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import { VISION_ACCENT, VISION_ACCENT2, APP_HREF } from "./theme";
import { VISION_WORLD_GUIDE, VISION_WORLD_SUGGESTIONS } from "./guide";
import VisionCapabilities from "./sections/VisionCapabilities";
import VisionHowScope from "./sections/VisionHowScope";

const GRAD = `linear-gradient(120deg, ${VISION_ACCENT}, ${VISION_ACCENT2})`;

const TOOL_SUMMARY =
  "ML Vision is an image-understanding platform inside AIRaML — three tasks in one app: classify " +
  "(1000 ImageNet classes, four backbones), detect (80 COCO classes, TinyYOLOv3) and segment " +
  "(150 ADE20K classes, SegFormer-B0). All models run as ONNX on a FastAPI backend. Free.";

const LaunchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const PREDS = [
  { label: "tabby cat", pct: 91 },
  { label: "tiger cat", pct: 6 },
  { label: "Egyptian cat", pct: 2 },
];

export default function VisionLandingPage() {
  useToolTracking("vision-world");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="pb-16">
      <ToolsAIChat context={{
        accent: VISION_ACCENT,
        tool: "ML Vision",
        summary: TOOL_SUMMARY,
        guide: VISION_WORLD_GUIDE,
        suggestions: VISION_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="ML Vision" accent={VISION_ACCENT} guide={VISION_WORLD_GUIDE} />

      {/* HERO */}
      <header className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--text3)" }}>
          Platform · ML Vision
        </p>
        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(2rem,5vw,3.2rem)" }}>
          Upload an image.{" "}
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Let it see.</span>
          <br />Classify, detect, segment.
        </h1>
        <p className="text-[15px] leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text2)" }}>
          ML Vision is a computer-vision world inside AIRaML — three tasks in one app. Classify an image
          across 1000 categories (and compare four backbones), detect and box every object, or segment
          the scene pixel by pixel — all on real ONNX models from one FastAPI backend.
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
            style={{ border: `1px solid ${VISION_ACCENT}45`, color: VISION_ACCENT, background: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Guide
          </button>
        </div>
        <div className="flex gap-4 flex-wrap mt-5 text-[13px]" style={{ color: "var(--text3)" }}>
          {["3 tasks in one app", "4 classifier backbones", "ONNX on FastAPI", "Free to use"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: VISION_ACCENT }} />{t}
            </span>
          ))}
        </div>

        {/* Signature see panel */}
        <div className="qa-xlate grid mt-9 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: "1fr auto 1fr", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-soft, var(--bg-card))" }}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>You upload — cat.jpg</h4>
            <div className="rounded-lg grid place-items-center aspect-[4/3]" style={{ border: "1px solid var(--border)", background: `${VISION_ACCENT}10`, color: VISION_ACCENT }} aria-hidden>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 16l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8.5" cy="9" r="1.5" />
              </svg>
            </div>
          </div>
          <div className="grid place-items-center px-1.5" style={{ background: "var(--bg-soft, var(--bg-card))", borderInline: "1px solid var(--border)", color: VISION_ACCENT2 }}>
            <svg className="qa-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="p-4 min-w-0 flex flex-col justify-center gap-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>ResNet50 predicts</h4>
            {PREDS.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-[13px] mb-1" style={{ color: "var(--text)" }}>
                  <span>{p.label}</span><span className="font-mono" style={{ color: VISION_ACCENT }}>{p.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: GRAD }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--text3)" }}>
          An illustrative classification. Your real image gets ranked labels, detection boxes or a
          pixel-level segmentation overlay — your choice of task.
        </p>
      </header>

      <VisionCapabilities />
      <VisionHowScope />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(120deg, ${VISION_ACCENT}14, transparent)`, border: `1px solid ${VISION_ACCENT}30` }}>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>See your first image.</h2>
          <p className="text-[15px] mt-2.5 mb-5 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            Pick a task, upload an image, and read the result — no setup, free.
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
