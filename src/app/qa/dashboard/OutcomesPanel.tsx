"use client";

import { useState } from "react";
import type { SeqPoint, TestPoint, Status } from "./dashboardData";
import { PASS, FAIL, ERR } from "./dashboardCharts";

/** Testwright dashboard — the interactive "Outcomes over time" strip.
 *
 * Fixes the "how do I know 5 tests = 1 run?" confusion with a labelled dual view:
 *   • Runs  — one bar per RUN (red if ANY test in it failed), click to drill in.
 *   • Tests — one bar per individual TEST CASE.
 * Both carry a hover tooltip; a run bar expands an inline per-test breakdown on click
 * (progressive disclosure) so you see exactly what passed/failed without re-running.
 */

const CARD: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 30px -18px rgba(0,0,0,0.25)",
};

const runColor = (s: Status) => (s === "passed" ? PASS : s === "failed" ? FAIL : ERR);
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtDur = (ms?: number | null) => (ms == null ? "" : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

const IconStrip = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="10" width="4" height="10" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="17" y="13" width="4" height="7" rx="1" />
  </svg>
);

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium pointer-events-none"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 6px 20px -6px rgba(0,0,0,0.35)" }}>
      {children}
    </div>
  );
}

function Legend() {
  const dot = (c: string, l: string) => (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
    </span>
  );
  return <div className="flex items-center gap-3">{dot(PASS, "passed")}{dot(FAIL, "failed")}{dot(ERR, "error")}</div>;
}

export default function OutcomesPanel({ sequence, testSequence, accent, reduced }: {
  sequence: SeqPoint[]; testSequence: TestPoint[]; accent: string; reduced: boolean;
}) {
  const [view, setView] = useState<"runs" | "tests">("runs");
  const [selected, setSelected] = useState<string | null>(null);

  const runs = sequence;
  const tests = testSequence.slice(-80);
  const sel = selected ? runs.find((r) => r.id === selected) ?? null : null;

  const toggle = (v: "runs" | "tests", label: string) => (
    <button key={v} onClick={() => setView(v)} className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-colors"
      style={view === v ? { background: accent, color: "#fff" } : { color: "var(--text2)" }}>{label}</button>
  );

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center" style={{ background: `${accent}1a`, color: accent }}>{IconStrip}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text2)" }}>Outcomes over time</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            {toggle("runs", "Runs")}{toggle("tests", "Tests")}
          </div>
          <Legend />
        </div>
      </div>

      <p className="text-[11px] mb-3" style={{ color: "var(--text3)" }}>
        {view === "runs"
          ? "Each bar is one run — red if any test in it failed. Click a bar to see its tests."
          : "Each bar is one individual test case — so a run of 5 tests becomes 5 bars."}
      </p>

      {/* The strip */}
      {view === "runs" ? (
        runs.length === 0 ? <Empty /> : (
          <div className="flex items-end gap-[3px]" style={{ height: 48 }}>
            {runs.map((r) => {
              const isSel = r.id === selected;
              return (
                <button key={r.id} onClick={() => setSelected(isSel ? null : r.id)}
                  className="group relative flex-1 h-full rounded-md transition-transform"
                  style={{ minWidth: 6, background: runColor(r.status),
                    outline: isSel ? `2px solid var(--text)` : undefined, outlineOffset: 2,
                    transform: reduced ? undefined : (isSel ? "scaleY(1)" : undefined) }}>
                  <Tooltip>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>{r.name}</span>
                    {" — "}<span style={{ color: PASS }}>{r.passedTests} passed</span>
                    {" · "}<span style={{ color: FAIL }}>{r.failedTests} failed</span>
                    {" · "}<span style={{ color: "var(--text3)" }}>{fmtDate(r.at)}</span>
                  </Tooltip>
                </button>
              );
            })}
          </div>
        )
      ) : (
        tests.length === 0 ? <Empty /> : (
          <div className="flex items-end gap-[2px] flex-wrap" style={{ rowGap: 3 }}>
            {tests.map((t, i) => (
              <div key={i} className="group relative rounded-sm" style={{ width: 9, height: 28, background: t.passed ? PASS : FAIL }}>
                <Tooltip>
                  <span style={{ color: t.passed ? PASS : FAIL }}>{t.passed ? "passed" : "failed"}</span>
                  {" — "}<span className="font-semibold" style={{ color: "var(--text)" }}>{t.title}</span>
                  <span style={{ color: "var(--text3)" }}>{"  ·  "}{t.runName}</span>
                </Tooltip>
              </div>
            ))}
          </div>
        )
      )}

      {/* Drill-down: the selected run's per-test breakdown */}
      {view === "runs" && sel && (
        <div className="mt-4 rounded-xl p-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{sel.name}</p>
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>
              <span style={{ color: PASS }}>{sel.passedTests} passed</span> · <span style={{ color: FAIL }}>{sel.failedTests} failed</span> · {fmtDate(sel.at)}
            </p>
          </div>
          {sel.detail && sel.detail.length ? (
            <ul className="flex flex-col gap-2">
              {sel.detail.map((t, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.status === "passed" ? PASS : FAIL }} />
                    <span className="text-[12px] flex-1 truncate" style={{ color: "var(--text2)" }} title={t.title}>{t.title}</span>
                    <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{fmtDur(t.duration)}</span>
                  </div>
                  {t.status !== "passed" && t.error && (
                    <p className="text-[11px] leading-snug ml-[18px] rounded-md px-2 py-1.5 font-mono"
                      style={{ background: `${FAIL}14`, color: "var(--text2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.error.slice(0, 500)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11.5px]" style={{ color: "var(--text3)" }}>
              Per-test detail wasn&apos;t recorded for this run (it predates the breakdown). Re-run it to capture the details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-[12px]" style={{ color: "var(--text3)" }}>No runs yet.</p>;
}
