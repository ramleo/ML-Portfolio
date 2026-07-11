"use client";

import { useEffect, useState, useCallback } from "react";

interface Step {
  target: string;        // data-wt attribute value
  title: string;
  body: string;
  position: "top" | "bottom" | "left" | "right";
}

const STEPS: Step[] = [
  { target: "question",   position: "bottom", title: "Ask in plain English",         body: "Type any question about your data — no SQL knowledge needed. Press Enter or click Ask." },
  { target: "provider",   position: "bottom", title: "Pick your AI provider",         body: "Groq is fastest. Switch to Gemini or Cohere if you hit a rate limit." },
  { target: "schema",     position: "right",  title: "Explore your schema",           body: "Browse tables and columns. Click any table to expand its columns and row count." },
  { target: "try-asking", position: "right",  title: "Sample questions",              body: "Click any of these to prefill the question box — great for exploring a new database." },
  { target: "db-connect", position: "bottom", title: "Connect your own database",     body: "Upload a SQLite file, or connect PostgreSQL / MySQL / SQL Server with a connection string." },
  { target: "question",   position: "top",    title: "You're ready!",                 body: "Run your first query. Results appear with charts, pagination, export, and AI explanation." },
];

const GAP = 12;
const CARD_W = 280;
const CARD_H = 210;

interface Rect { top: number; left: number; width: number; height: number; }

function getRect(target: string): Rect | null {
  const el = document.querySelector(`[data-wt="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function cardPos(rect: Rect, position: Step["position"]): { top: number; left: number } {
  switch (position) {
    case "bottom": return { top: rect.top + rect.height + GAP, left: rect.left + rect.width / 2 - CARD_W / 2 };
    case "top":    return { top: rect.top - GAP - CARD_H,      left: rect.left + rect.width / 2 - CARD_W / 2 };
    case "right":  return { top: rect.top + rect.height / 2 - CARD_H / 2, left: rect.left + rect.width + GAP };
    case "left":   return { top: rect.top + rect.height / 2 - CARD_H / 2, left: rect.left - CARD_W - GAP };
  }
}

function clamp(pos: { top: number; left: number }): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    top:  Math.max(8, Math.min(pos.top,  vh - CARD_H - 20)),
    left: Math.max(8, Math.min(pos.left, vw - CARD_W - 8)),
  };
}

export default function WalkthroughTooltip() {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);

  const current = STEPS[step];

  const measure = useCallback(() => {
    setRect(getRect(current.target));
  }, [current.target]);

  useEffect(() => {
    if (done) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, done]);

  const finish = () => {
    setDone(true);
    try { localStorage.setItem("ml_sql_walked", "1"); } catch { /* ignore */ }
  };

  const next = () => {
    if (step >= STEPS.length - 1) { finish(); return; }
    setStep(s => s + 1);
  };

  const back = () => setStep(s => Math.max(0, s - 1));

  if (done || !rect) return null;

  const pos = clamp(cardPos(rect, current.position));

  return (
    <>
      {/* dark overlay with hole */}
      <div className="fixed inset-0 z-[998] pointer-events-none" style={{
        background: "rgba(0,0,0,0.65)",
        WebkitMaskImage: `radial-gradient(ellipse ${rect.width + 16}px ${rect.height + 16}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 99%, black 100%)`,
        maskImage: `radial-gradient(ellipse ${rect.width + 16}px ${rect.height + 16}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 99%, black 100%)`,
      }} />
      {/* highlight ring */}
      <div className="fixed z-[999] pointer-events-none rounded-xl" style={{
        top: rect.top - 6, left: rect.left - 6,
        width: rect.width + 12, height: rect.height + 12,
        boxShadow: "0 0 0 2px #6366f1, 0 0 24px rgba(99,102,241,0.4)",
        animation: "pulse-ring 2s ease-in-out infinite",
      }} />
      {/* tip card */}
      <div className="fixed z-[1000] rounded-xl border border-indigo-500/40 bg-[#0f0f1f] shadow-2xl p-4 pointer-events-auto"
        style={{ width: CARD_W, ...pos }}>
        <div className="flex items-start justify-between mb-2">
          <span className="text-[9px] text-indigo-400/60 font-semibold uppercase tracking-widest">Step {step + 1} of {STEPS.length}</span>
          <button onClick={finish} className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors">Skip tour</button>
        </div>
        <p className="text-[13px] font-semibold text-white mb-1">{current.title}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{current.body}</p>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={back} className="text-[11px] px-3 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">← Back</button>
          )}
          <button onClick={next}
            className="flex-1 text-[11px] px-3 py-1 rounded-lg text-white font-medium transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {step >= STEPS.length - 1 ? "Done ✓" : "Next →"}
          </button>
        </div>
        <div className="flex gap-1 justify-center mt-3">
          {STEPS.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? "bg-indigo-400" : "bg-white/15"}`} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse-ring { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </>
  );
}