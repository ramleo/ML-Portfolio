"use client";

import { EDA_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Upload a CSV", p: "Drag in any CSV, or load the sample dataset. No setup, no code — the profile starts building immediately." },
  { n: "02", h: "Explore the sections", p: "Scroll overview, distributions, correlations, PCA and insights. Every chart is interactive: hover for values, rotate the 3D PCA, recolour by any column." },
  { n: "03", h: "Export a report", p: "Download the whole profile as a PDF or a self-contained HTML report to share with your team or keep for later." },
];

const CAN = [
  "Shape, dtypes, memory and per-column missing / unique counts",
  "Interactive histograms, bar charts and box plots (outliers)",
  "Pearson correlation + mutual-information heatmaps",
  "Rotatable 3D PCA and a scatter-plot matrix",
  "Plain-language auto-insights — no code",
  "PDF / HTML report export",
];

const CANT = [
  "Tabular CSV only — not images, audio or free text",
  "Large / wide files are sampled for the heavier charts",
  "It describes data; it doesn't clean, transform or model it",
  "Uploads are processed for the profile, not kept as a dataset",
  "Auto-insights are a starting point, not a substitute for judgement",
];

export default function EdaHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>How it works</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Upload → explore → export
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="font-mono text-sm font-semibold" style={{ color: EDA_ACCENT }}>{s.n}</div>
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
          A full profile, with the caveats stated
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          It turns one upload into the analysis you&apos;d otherwise hand-write — and it describes your
          data, it doesn&apos;t decide for you.
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
