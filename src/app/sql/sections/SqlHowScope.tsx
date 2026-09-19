"use client";

import { SQL_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Pick a database", p: "Start on the Chinook demo, upload a CSV, or connect your own PostgreSQL / MySQL / SQL Server. Browse the schema and its ER diagram." },
  { n: "02", h: "Ask in plain English", p: "Type a question — \"total revenue for each year\". A free LLM (Groq → Mistral → Cohere) writes SQL for your schema; you see the query before it runs." },
  { n: "03", h: "Run and understand", p: "The SQL runs live with pagination and filtering, and an LLM explains the query and the results in plain English." },
];

const CAN = [
  "Natural-language → SQL for your own schema, live",
  "Real execution with pagination + column filtering",
  "Plain-English explanation of the query and the results",
  "Chinook demo, CSV upload, or your Postgres / MySQL / SQL Server",
  "Schema explorer + ER diagram",
  "Multiple free LLM providers, with fallback",
];

const CANT = [
  "AI-generated SQL — verify results before you rely on them",
  "Aimed at reading / analysing, not bulk unbounded exports",
  "Results are paginated and bounded, not a full data dump",
  "No writes/DDL by intent — it's for asking, not migrating",
  "Your connection details aren't stored server-side",
];

export default function SqlHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>How it works</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Pick → ask → understand
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="font-mono text-sm font-semibold" style={{ color: SQL_ACCENT }}>{s.n}</div>
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
          Real queries, with the caveats stated
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          The SQL is written by a language model and runs against a real database. That is powerful and
          fast — and it means the output is a draft to check, not an oracle.
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
