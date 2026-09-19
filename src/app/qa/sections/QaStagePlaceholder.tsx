"use client";

import Link from "next/link";
import { STAGES, STATUS_COLOR, QA_ACCENT } from "../theme";

/** Shared "on the roadmap" page for the stages that aren't built yet
 *  (Run, Discover, Heal). Honest about status; points to what is live. */
export default function QaStagePlaceholder({ stageKey }: { stageKey: string }) {
  const stage = STAGES.find((s) => s.key === stageKey);
  if (!stage) return null;
  const c = STATUS_COLOR[stage.status];

  return (
    <div className="max-w-6xl mx-auto px-4 py-14 w-full">
      <div className="rounded-2xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: `${QA_ACCENT}18`, border: `1px solid ${QA_ACCENT}30`, color: QA_ACCENT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{stage.label}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: c, border: `1px solid ${c}70`, background: `${c}18` }}>{stage.statusLabel}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{stage.analog}</p>
          </div>
        </div>

        <p className="text-[15px] leading-relaxed mt-5 max-w-2xl" style={{ color: "var(--text2)" }}>{stage.blurb}</p>

        <p className="text-[13px] mt-4" style={{ color: "var(--text3)" }}>
          This stage is on the roadmap. The <b style={{ color: "var(--text2)" }}>Author</b> stage is live now —
          write and copy real Playwright tests today.
        </p>

        <Link href="/qa/author" className="inline-flex items-center gap-2 font-semibold text-sm px-4 py-2 rounded-full mt-5"
          style={{ background: QA_ACCENT, color: "#fff" }}>
          Go to Author
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>

      {/* mini roadmap */}
      <div className="flex items-center gap-2 mt-6 flex-wrap text-[13px]" style={{ color: "var(--text3)" }}>
        {STAGES.map((s, i) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5" style={{ color: s.key === stageKey ? "var(--text)" : "var(--text3)", fontWeight: s.key === stageKey ? 700 : 400 }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />{s.label}
            </span>
            {i < STAGES.length - 1 && <span>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
