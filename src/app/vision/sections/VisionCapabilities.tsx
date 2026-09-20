"use client";

import { TASKS, VISION_ACCENT } from "../theme";

const ICONS: Record<string, React.ReactNode> = {
  classify: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8.5" cy="8.5" r="1.5" /></>,
  detect: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /><path d="M13 5h6M17 5v6M5 13v6M5 17h6" strokeLinecap="round" strokeDasharray="2 2" /></>,
  segment: <><path d="M3 3h18v18H3z" /><path d="M3 12h18M12 3v9M7 12v9M17 12v9" strokeLinecap="round" /></>,
};

export default function VisionCapabilities() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" id="how">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
        One app, three vision tasks
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
        Classify, detect, segment
      </h2>
      <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
        The three workhorse computer-vision tasks, all on real ONNX models from one backend. Each is
        live, and each states the models and label set behind it.
      </p>

      <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(260px,100%),1fr))" }}>
        {TASKS.map((t) => (
          <div key={t.key} className="h-full flex flex-col gap-2.5 rounded-2xl p-[18px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between">
              <div className="w-[38px] h-[38px] rounded-[10px] grid place-items-center"
                style={{ background: `${VISION_ACCENT}18`, border: `1px solid ${VISION_ACCENT}30`, color: VISION_ACCENT }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{ICONS[t.key]}</svg>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: "#34d399", border: "1px solid #34d39970", background: "#34d39918" }}>● Live</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{t.label}</h3>
            <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text2)" }}>{t.blurb}</p>
            <div className="pt-1 border-t flex flex-col gap-0.5" style={{ borderColor: "var(--border)" }}>
              <span className="text-[12px] font-medium" style={{ color: VISION_ACCENT }}>{t.classes}</span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>{t.models}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
