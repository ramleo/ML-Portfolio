"use client";

import { QA_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Describe or discover", p: "Type the steps in plain English, paste a written test case, or let Discover render a page and propose test cases for you." },
  { n: "02", h: "Generate the test", p: "A free LLM (Cohere → Mistral, budget-capped) returns one runnable Playwright TypeScript file — role/text/label locators, real assertions, a comment on each choice." },
  { n: "03", h: "Run, then heal", p: "Execute on an isolated CI runner for pass/fail with video and a full trace. If a locator breaks, self-healing re-resolves it from the page and re-runs." },
];

const CAN = [
  "Plain-English or imported description → Playwright TypeScript",
  "Resilient role / text / accessible-name locators, with real assertions",
  "Execute on isolated CI (GitHub Actions): screenshots, video, trace, step timeline",
  "AI self-healing — re-resolve a broken locator from the page and re-run",
  "Discover — render a URL, read its structure, and propose test cases",
  "Saved tests and run history with a pass-rate, all in the browser",
];

const CANT = [
  "Native mobile, desktop or mainframe apps",
  "Email deliverability, SMS or phone-call flows",
  "Massive parallel browser / OS / device matrices (one free runner at a time)",
  "Private or internal (non-public) addresses",
  "Instant results — a run queues and spins up a runner, so expect about a minute",
];

export default function QaHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>
            How it works
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Describe → generate → run → heal
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>Scope</p>
        <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
          What it does, and what it doesn&apos;t
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          The full authoring-to-healing loop, free and running real browsers on isolated CI. Here is
          what is in scope and what is out — stated plainly.
        </p>
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))" }}>
          <ScopeCard title="What Testwright does" tag="In scope" tagColor="#34d399" items={CAN} mark="✓" markColor="#34d399" />
          <ScopeCard title="What it doesn't do" tag="Out of scope" tagColor="#94a3b8" items={CANT} mark="—" markColor="#94a3b8" />
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
