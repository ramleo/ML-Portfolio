"use client";

import { useState } from "react";
import Link from "next/link";
import { useToolTracking } from "@/hooks/useAnalytics";
import ToolsAIChat from "@/components/ToolsAIChat";
import WorldUserGuideModal from "@/components/world/WorldUserGuideModal";
import { QA_ACCENT, QA_ACCENT2 } from "./theme";
import { QA_WORLD_GUIDE, QA_WORLD_SUGGESTIONS } from "./worldGuide";
import QaLifecycle from "./sections/QaLifecycle";
import QaHowScope from "./sections/QaHowScope";

const GRAD = `linear-gradient(120deg, ${QA_ACCENT}, ${QA_ACCENT2})`;

const TOOL_SUMMARY =
  "Testwright is the QA-automation platform inside AIRaML — a full workspace, not a single tool. " +
  "It turns plain-English descriptions into real Playwright TypeScript tests with resilient locators, " +
  "and on the roadmap runs and heals them. Four stages: Author (live), Run, Discover, Heal. Free, " +
  "own-site first.";

export default function QaLandingPage() {
  useToolTracking("qa-world");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="pb-16">
      <ToolsAIChat context={{
        accent: QA_ACCENT,
        tool: "Testwright",
        summary: TOOL_SUMMARY,
        guide: QA_WORLD_GUIDE,
        suggestions: QA_WORLD_SUGGESTIONS,
      }} />
      <WorldUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} title="Testwright" accent={QA_ACCENT} guide={QA_WORLD_GUIDE} />
      {/* HERO */}
      <header className="max-w-6xl mx-auto px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "var(--text3)" }}>
          Platform · QA Automation
        </p>
        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ color: "var(--text)", fontSize: "clamp(2rem,5vw,3.2rem)" }}>
          Write a test in{" "}
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>plain English.</span>
          <br />Get real Playwright code.
        </h1>
        <p className="text-[15px] leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text2)" }}>
          Testwright is the QA-automation world inside AIRaML — a full workspace, not a single tool.
          Describe what to check the way you&apos;d tell a teammate; it writes a runnable Playwright test
          in TypeScript with resilient locators. Free, open-source engine, aimed first at this site itself.
        </p>
        <div className="flex gap-2.5 flex-wrap mt-6">
          <Link href="/qa/author" className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ background: GRAD, color: "#fff" }}>
            Open the Author
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <a href="#lifecycle" className="inline-flex items-center font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: "1px solid var(--border2)", color: "var(--text)" }}>
            See how it works
          </a>
          <button onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 font-semibold text-sm px-[18px] py-2.5 rounded-full"
            style={{ border: `1px solid ${QA_ACCENT}45`, color: QA_ACCENT, background: "transparent" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Guide
          </button>
        </div>
        <div className="flex gap-4 flex-wrap mt-5 text-[13px]" style={{ color: "var(--text3)" }}>
          {["Free to run", "Playwright · TypeScript", "Resilient locators", "Your own site first"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: QA_ACCENT }} />{t}
            </span>
          ))}
        </div>

        {/* Signature translation panel */}
        <div className="qa-xlate grid mt-9 rounded-2xl overflow-hidden" style={{ gridTemplateColumns: "1fr auto 1fr", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-4" style={{ background: "var(--bg-soft, var(--bg-card))" }}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>You describe</h4>
            {[
              <>Open the home page.</>,
              <>Click the link to the <b style={{ color: QA_ACCENT }}>tools</b> section.</>,
              <>Check the tools heading is visible.</>,
              <>Search <b style={{ color: QA_ACCENT }}>&quot;anomaly&quot;</b> and expect a result card.</>,
            ].map((line, i) => (
              <p key={i} className="text-[13px] leading-snug mb-2" style={{ color: "var(--text)" }}>{line}</p>
            ))}
          </div>
          <div className="grid place-items-center px-1.5" style={{ background: "var(--bg-soft, var(--bg-card))", borderInline: "1px solid var(--border)", color: QA_ACCENT2 }}>
            <svg className="qa-arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="p-4 min-w-0">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--text3)" }}>Testwright writes</h4>
            <pre className="font-mono text-[12px] leading-relaxed overflow-x-auto m-0" style={{ color: "var(--text2)" }}><code>{SAMPLE_CODE}</code></pre>
          </div>
        </div>
        <p className="text-[12px] mt-3" style={{ color: "var(--text3)" }}>
          A real generation, shown as an example. The Author writes the draft — you review and run it.
        </p>
      </header>

      <QaLifecycle />
      <QaHowScope />

      {/* Home integration note */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(120deg, ${QA_ACCENT}14, transparent)`, border: `1px solid ${QA_ACCENT}30` }}>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Approve the shape, and the world grows.</h2>
          <p className="text-[15px] mt-2.5 mb-5 max-w-xl mx-auto" style={{ color: "var(--text2)" }}>
            The Author stage runs live today. Next is the Run stage — executing tests against this site and showing pass/fail.
          </p>
          <Link href="/qa/author" className="inline-flex items-center gap-2 font-semibold text-sm px-[18px] py-2.5 rounded-full mx-auto" style={{ background: GRAD, color: "#fff" }}>
            Open the Author
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

const SAMPLE_CODE = `import { test, expect } from '@playwright/test';

test('tools search', async ({ page }) => {
  // role/name, not a brittle CSS path
  await page.goto(BASE_URL);
  await page.getByRole('link',
    { name: 'Tools' }).click();
  await expect(page.getByRole('heading',
    { name: 'Tools' })).toBeVisible();
  await page.getByPlaceholder('Search')
    .fill('anomaly');
  await expect(page.getByTestId('tool-card'))
    .toHaveCount(1);
});`;
