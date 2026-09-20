"use client";

import { MODELS, ML_ACCENT } from "../theme";

/** The four trained models, as a card grid. Each states its real held-out
 *  metric so the claim matches what the model actually does. */
export default function MlCapabilities() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" id="how">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
        One app, four models
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
        Pick a model, get a prediction
      </h2>
      <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
        Three classifiers and a regressor, each trained on a real dataset and served from one
        schema-driven backend. Each card shows the model&apos;s real held-out metric.
      </p>

      <div className="grid gap-4 mt-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%),1fr))" }}>
        {MODELS.map((m) => (
          <div key={m.key} className="h-full flex flex-col gap-2.5 rounded-2xl p-[18px]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: ML_ACCENT, border: `1px solid ${ML_ACCENT}55`, background: `${ML_ACCENT}18` }}>{m.task}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: "#34d399", border: "1px solid #34d39970", background: "#34d39918" }}>● Live</span>
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{m.label}</h3>
            <p className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text2)" }}>{m.blurb}</p>
            <div className="flex items-baseline justify-between pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[12px]" style={{ color: "var(--text3)" }}>{m.algo}</span>
              <span className="font-mono text-sm font-semibold" style={{ color: ML_ACCENT }}>
                {m.metric}<span className="text-[11px] font-normal ml-1" style={{ color: "var(--text3)" }}>{m.metricLabel}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
