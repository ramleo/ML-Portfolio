"use client";

import { CAPABILITIES, SQL_ACCENT, SQL_ACCENT2 } from "../theme";

const ICONS: Record<string, React.ReactNode> = {
  ask: <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />,
  run: <path d="M7 4v16l13-8z" strokeLinejoin="round" />,
  explain: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" strokeLinecap="round" strokeLinejoin="round" /></>,
  connect: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" strokeLinecap="round" /></>,
};

export default function SqlCapabilities() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" id="how">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
        One workspace, four capabilities
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
        Question in, answer out
      </h2>
      <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
        Ask → run → explain, over a database you choose. Every capability is live today — the whole
        pipeline runs against a real database, not a canned preview.
      </p>

      <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%),1fr))" }}>
        {CAPABILITIES.map((c) => (
          <div key={c.key} className="h-full flex flex-col gap-2.5 rounded-2xl p-[18px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between">
              <div className="w-[38px] h-[38px] rounded-[10px] grid place-items-center"
                style={{ background: `${SQL_ACCENT}18`, border: `1px solid ${SQL_ACCENT}30`, color: SQL_ACCENT }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{ICONS[c.key]}</svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: "#34d399", border: "1px solid #34d39970", background: "#34d39918" }}>● Live</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{c.label}</h3>
            <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text2)" }}>{c.blurb}</p>
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>{c.note}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-5 text-[13px] flex-wrap" style={{ color: "var(--text3)" }}>
        {CAPABILITIES.map((c, i) => (
          <span key={c.key} className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: "var(--text2)" }}>{c.label}</span>
            {i < CAPABILITIES.length - 1 && <span style={{ color: SQL_ACCENT2 }}>→</span>}
          </span>
        ))}
        <span className="ml-1">natural language in, explained SQL out</span>
      </div>
    </section>
  );
}
