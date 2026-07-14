"use client";

import GuideSections from "./AnalyticsUserGuideSections";

const A = "#10b981";

interface Props { onClose: () => void; }

const NAV = [
  { id: "ug-range", label: "Range" }, { id: "ug-stats", label: "Stat Cards" },
  { id: "ug-sparkline", label: "Sparkline" }, { id: "ug-funnel", label: "Funnel" },
  { id: "ug-geo", label: "Geo Map" }, { id: "ug-heatmap", label: "Heatmap" },
  { id: "ug-tools", label: "Tool Comparison" }, { id: "ug-qsr", label: "Query SR" },
  { id: "ug-provider", label: "AI Provider" }, { id: "ug-engage", label: "Engagement" },
  { id: "ug-pages", label: "Top Pages" }, { id: "ug-refs", label: "Referrers" },
  { id: "ug-types", label: "Event Types" }, { id: "ug-feed", label: "Live Feed" },
  { id: "ug-session", label: "Session Trace" },
];

export default function AnalyticsUserGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <style>{`
        .ug-pill:hover { border-color: ${A} !important; color: ${A} !important; }
        .ug-nav { scrollbar-width: none; }
        .ug-nav::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#0b0e1c", border: "1px solid rgba(255,255,255,0.09)" }}>

        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "#0b0e1c", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{
              background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(99,102,241,0.12))",
              border: "1px solid rgba(16,185,129,0.28)",
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke={A} strokeWidth="1.3"/>
                <path d="M8 11V7.5M8 5.5v-.5" stroke={A} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[14px] font-bold leading-tight" style={{
                background: `linear-gradient(90deg, ${A}, #6366f1)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Real-Time Analytics</h1>
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.14em] mt-0.5">User Guide</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: "#4b5563", border: "1px solid rgba(255,255,255,0.08)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#4b5563"; }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="ug-nav flex gap-1.5 overflow-x-auto pb-3 mb-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {NAV.map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                className="ug-pill text-[9px] px-2.5 py-[4px] rounded-full whitespace-nowrap transition-colors shrink-0"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#4b5563" }}>
                {label}
              </a>
            ))}
          </div>
          <GuideSections />
        </div>

        <div className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
          <span className="text-[9.5px] text-gray-700 uppercase tracking-widest">Real-Time Analytics · ML Portfolio</span>
          <button onClick={onClose}
            className="text-[11px] px-4 py-1.5 rounded-lg font-semibold text-white transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${A}, #059669)` }}>
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}