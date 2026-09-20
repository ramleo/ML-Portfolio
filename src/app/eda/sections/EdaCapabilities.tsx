"use client";

import { SECTIONS, EDA_ACCENT } from "../theme";

const ICONS: Record<string, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" strokeLinecap="round" /></>,
  distributions: <path d="M4 20V10M9 20V4M14 20v-7M19 20V8" strokeLinecap="round" />,
  correlations: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>,
  pca: <><path d="M12 3v18M12 12l7-4M12 12l-7-4M12 12l7 4M12 12l-7 4" strokeLinecap="round" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
  insights: <><path d="M9 18h6M10 21h4M12 3a6 6 0 013 11.2V16H9v-1.8A6 6 0 0112 3z" strokeLinecap="round" strokeLinejoin="round" /></>,
  report: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" /><path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" /></>,
};

export default function EdaCapabilities() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" id="how">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
        One upload, a full profile
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
        Everything you need to understand a dataset
      </h2>
      <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
        Drop in a CSV and get the whole picture — structure, distributions, relationships and a
        shareable report. Every section is live and interactive.
      </p>

      <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%),1fr))" }}>
        {SECTIONS.map((s) => (
          <div key={s.key} className="h-full flex flex-col gap-2.5 rounded-2xl p-[18px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between">
              <div className="w-[38px] h-[38px] rounded-[10px] grid place-items-center"
                style={{ background: `${EDA_ACCENT}18`, border: `1px solid ${EDA_ACCENT}30`, color: EDA_ACCENT }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{ICONS[s.key]}</svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: "#34d399", border: "1px solid #34d39970", background: "#34d39918" }}>● Live</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{s.label}</h3>
            <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text2)" }}>{s.blurb}</p>
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
