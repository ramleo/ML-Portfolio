"use client";

import { ML_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Pick a model", p: "Choose one of the four models from the sidebar. The form on the right rebuilds itself from that model's feature schema — the right fields, labels and ranges." },
  { n: "02", h: "Fill the form", p: "Every numeric field shows its valid range and step; categorical fields become dropdowns. Sensible defaults are pre-filled, so you can predict right away." },
  { n: "03", h: "Predict and read", p: "The trained model runs on the FastAPI backend. Classifiers return the class plus per-class probabilities; the regressor returns the predicted value." },
];

const CAN = [
  "Four trained models — Iris, Titanic, Diabetes, Insurance",
  "Forms generated automatically from each model's schema",
  "Live predictions from a real FastAPI backend",
  "Class probabilities for classifiers, a value for the regressor",
  "Honest held-out metric shown for every model",
  "One microservice shared with EDA Explorer + Vision",
];

const CANT = [
  "Compact models on small public datasets — a demo, not a product",
  "Not medical, financial or actuarial advice",
  "A prediction is only as good as its inputs and training data",
  "Inputs must stay within each field's stated range",
  "Probabilities are the model's estimate, not ground truth",
];

export default function MlHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>How it works</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Pick → fill → predict
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="font-mono text-sm font-semibold" style={{ color: ML_ACCENT }}>{s.n}</div>
                <h3 className="text-[15px] font-bold mt-1" style={{ color: "var(--text)" }}>{s.h}</h3>
                <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: "var(--text2)" }}>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>Honest scope</p>
        <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
          Real models, with the caveats stated
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          These are real trained models on real data — and they are compact models on small public
          datasets, built to show an end-to-end ML app cleanly, not to give advice.
        </p>
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))" }}>
          <ScopeCard title="What it does" tag="Live" tagColor="#34d399" items={CAN} mark="✓" markColor="#34d399" />
          <ScopeCard title="What to keep in mind" tag="Caveats" tagColor="#94a3b8" items={CANT} mark="—" markColor="#94a3b8" />
        </div>
      </section>
    </>
  );
}

function ScopeCard({ title, tag, tagColor, items, mark, markColor }: {
  title: string; tag: string; tagColor: string; items: string[]; mark: string; markColor: string;
}) {
  return (
    <div className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-[15px] font-bold flex items-center gap-2 mb-3" style={{ color: "var(--text)" }}>
        <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ color: tagColor, border: `1px solid ${tagColor}70`, background: `${tagColor}18` }}>{tag}</span>
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it} className="text-[13px] leading-relaxed pl-6 relative" style={{ color: "var(--text2)" }}>
            <span className="absolute left-0 font-bold" style={{ color: markColor }}>{mark}</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
