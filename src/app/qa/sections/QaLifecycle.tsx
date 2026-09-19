"use client";

import Link from "next/link";
import { STAGES, STATUS_COLOR, QA_ACCENT, QA_ACCENT2 } from "../theme";

const ICONS: Record<string, React.ReactNode> = {
  author: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />,
  run: <path d="M7 4v16l13-8z" strokeLinejoin="round" />,
  discover: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /></>,
  heal: <path d="M12 2l2.4 6.9H22l-6 4.3 2.3 6.8-6.3-4.4-6.3 4.4L8 13.2 2 8.9h7.6z" strokeLinejoin="round" />,
};

export default function QaLifecycle() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" id="lifecycle">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
        One workspace, four stages
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
        The QA lifecycle, end to end
      </h2>
      <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
        One world made of stages that hand off to each other — author a test, run it on isolated CI,
        discover new cases from a page, and heal a break across the whole suite. All four stages are
        live today.
      </p>

      <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%),1fr))" }}>
        {STAGES.map((s) => {
          const c = STATUS_COLOR[s.status];
          const card = (
            <div className="h-full flex flex-col gap-2.5 rounded-2xl p-[18px] transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between">
                <div className="w-[38px] h-[38px] rounded-[10px] grid place-items-center"
                  style={{ background: `${QA_ACCENT}18`, border: `1px solid ${QA_ACCENT}30`, color: QA_ACCENT }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{ICONS[s.key]}</svg>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ color: c, border: `1px solid ${c}70`, background: `${c}18` }}>
                  {s.status === "live" ? "● " : ""}{s.statusLabel}
                </span>
              </div>
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{s.label}</h3>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text2)" }}>{s.blurb}</p>
              <p className="text-[12px]" style={{ color: "var(--text3)" }}>{s.analog}</p>
            </div>
          );
          return s.status === "live"
            ? <Link key={s.key} href={s.href} className="block">{card}</Link>
            : <div key={s.key}>{card}</div>;
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-5 text-[13px] flex-wrap" style={{ color: "var(--text3)" }}>
        {STAGES.map((s, i) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: "var(--text2)" }}>{s.label}</span>
            {i < STAGES.length - 1 && (
              <span style={{ color: QA_ACCENT2 }}>→</span>
            )}
          </span>
        ))}
        <span className="ml-1">each stage feeds the next — one workspace, one record</span>
      </div>
    </section>
  );
}
