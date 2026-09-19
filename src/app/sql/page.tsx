"use client";

import { useState } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import { SQL_ACCENT, SQL_ACCENT2, TOOL_HREF } from "./theme";
import { SQL_WORLD_GUIDE, SQL_WORLD_SUGGESTIONS } from "./worldGuide";
import SqlCapabilities from "./sections/SqlCapabilities";
import SqlHowScope from "./sections/SqlHowScope";

const GRAD = `linear-gradient(120deg, ${SQL_ACCENT}, ${SQL_ACCENT2})`;

const TOOL_SUMMARY =
  "The Text-to-SQL platform inside AIRaML: ask a question in plain English and get SQL, run live " +
  "against a real database (Chinook demo, a CSV, or your own Postgres/MySQL/SQL Server), with an LLM " +
  "explanation of the query and the results. Its own FastAPI + LLM backend.";

export default function SqlLandingPage() {
  useToolTracking("sql-world");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="pb-16">
      <ToolsAIChat context={{
        accent: SQL_ACCENT,
        tool: "Text-to-SQL",
        summary: TOOL_SUMMARY,
        guide: SQL_WORLD_GUIDE,
        suggestions: SQL_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="Text-to-SQL" accent={SQL_ACCENT} guide={SQL_WORLD_GUIDE} />

      {/* HERO */}
      <header className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--text3)" }}>
          Platform · Text-to-SQL
        </p>
        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(2rem,5vw,3.2rem)" }}>
          Ask your database in{" "}
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>plain English.</span>
          <br />Get SQL, results, and the reasoning.
        </h1>
        <p className="text-[15px] leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text2)" }}>
          Text-to-SQL is a full data-querying world inside AIRaML. Ask a question the way you&apos;d say it;
          a free LLM writes SQL for your schema, runs it live against a real database, and explains both
          the query and the results — its own FastAPI backend behind it.
        </p>
        <div className="flex gap-2.5 flex-wrap mt-6">
          <Link href={TOOL_HREF} className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ background: GRAD, color: "#fff" }}>
            Open the tool
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <a href="#how" className="inline-flex items-center font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
            See how it works
          </a>
          <button onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: `1px solid ${SQL_ACCENT}45`, color: SQL_ACCENT, background: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Guide
          </button>
        </div>
        <div className="flex gap-4 flex-wrap mt-5 text-[13px]" style={{ color: "var(--text3)" }}>
          {["Live database", "Multi-provider LLM", "Explained queries", "Demo · CSV · your DB"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SQL_ACCENT }} />{t}
            </span>
          ))}
        </div>

        {/* Signature translation panel */}
        <div className="qa-xlate grid mt-9 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: "1fr auto 1fr", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-soft, var(--bg-card))" }}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>You ask</h4>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text)" }}>
              Show me the top 5 <b style={{ color: SQL_ACCENT }}>artists</b> by total album count.
            </p>
            <p className="text-[12px] leading-relaxed mt-3" style={{ color: "var(--text3)" }}>
              on the Chinook demo · 11 tables · ~15.6k rows
            </p>
          </div>
          <div className="grid place-items-center px-1.5" style={{ background: "var(--bg-soft, var(--bg-card))", borderInline: "1px solid var(--border)", color: SQL_ACCENT2 }}>
            <svg className="qa-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="p-4 min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>Text-to-SQL writes</h4>
            <pre className="font-mono text-[12px] leading-relaxed overflow-x-auto m-0" style={{ color: "var(--text2)" }}><code>{SAMPLE_SQL}</code></pre>
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--text3)" }}>
          A real example. The SQL is AI-generated — the tool shows it and explains it, so you can verify before trusting it.
        </p>
      </header>

      <SqlCapabilities />
      <SqlHowScope />

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(120deg, ${SQL_ACCENT}14, transparent)`, border: `1px solid ${SQL_ACCENT}30` }}>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Ask your first question.</h2>
          <p className="text-[15px] mt-2.5 mb-5 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            Start on the Chinook demo — no setup — or connect your own database.
          </p>
          <Link href={TOOL_HREF} className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full mx-auto" style={{ background: GRAD, color: "#fff" }}>
            Open the tool
          </Link>
        </div>
      </section>

      <style>{`
        @media (max-width: 760px){
          .qa-xlate { grid-template-columns: 1fr !important; }
          .qa-xlate .qa-arrow { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}

const SAMPLE_SQL = `SELECT ar.Name AS artist,
       COUNT(al.AlbumId) AS albums
FROM Artist ar
JOIN Album al
  ON al.ArtistId = ar.ArtistId
GROUP BY ar.ArtistId
ORDER BY albums DESC
LIMIT 5;`;
