"use client";

import { QA_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Describe the scenario", p: "Type the steps in plain English, paste a written test case, or (soon) record a click-through. Point it at our own site." },
  { n: "02", h: "Generate the test", p: "A free LLM (Cohere → Mistral, budget-capped) returns one runnable Playwright TypeScript file — role/text/label locators, real assertions, comments on each choice." },
  { n: "03", h: "Review, copy, run", p: "Read the annotated draft, copy it into a Playwright project, and run it. Execution inside the workspace arrives in Phase 2." },
];

const CAN = [
  "Plain-English, recorded, or imported → Playwright TypeScript",
  "Resilient role / text / accessible-name locators, with assertions",
  "Bounded execution against our own site: screenshots, video, trace",
  "Crawl → propose → confirm → run (own site)",
  "Root-cause failure grouping + one-click / one-by-one bulk fix",
  "Data-driven runs, visual + accessibility checks, CI via GitHub Actions",
];

const CANT = [
  "3,000+ browser / OS / device combinations on a paid device farm",
  "Native mobile, desktop and mainframe testing",
  "Email deliverability, SMS and phone-call flows",
  "Arbitrary third-party URLs (SSRF risk) — own site / verified only",
  "Full-fleet parallelism and \"regression in under 15 minutes\"",
  "SOC 2 / HIPAA / ISO compliance certifications",
];

export default function QaHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
            How the Author works today
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Describe → generate → review
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="font-mono text-sm font-semibold" style={{ color: QA_ACCENT }}>{s.n}</div>
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
          A real workspace — not a device farm
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          testRigor and Katalon are proven over millions of runs across web, mobile, desktop and mainframe
          on paid infrastructure. We build the core value free, for our own site, and say plainly where the line is.
        </p>
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))" }}>
          <ScopeCard title="What Testwright does" tag="Free stack" tagColor="#34d399" items={CAN} mark="✓" markColor="#34d399" />
          <ScopeCard title="What needs scale we don't have" tag="Out of scope" tagColor="#94a3b8" items={CANT} mark="—" markColor="#94a3b8" />
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
