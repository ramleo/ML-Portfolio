"use client";

import { useEffect, useState } from "react";
import { useRun } from "./useRun";

const DEFAULT_BASE_URL = "https://ml-portfolio-rho.vercel.app";
const MAX_CHARS = 60000;

const SAMPLE = `import { test, expect } from '@playwright/test';

test.describe('home page smoke', () => {
  test('home page loads and shows content', async ({ page }) => {
    await page.goto('https://ml-portfolio-rho.vercel.app', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });
});
`;

const STEPS = ["Queued", "Running", "Results"] as const;

function stepIndex(phase: string): number {
  if (phase === "queued") return 0;
  if (phase === "in_progress") return 1;
  if (phase === "completed" || phase === "error") return 2;
  return -1;
}

export default function RunRunner({ accent }: { accent: string }) {
  const { state, run, reset } = useRun();
  const [code, setCode] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [testName, setTestName] = useState("");

  // Carry a test over from the Author stage ("Send to Run").
  useEffect(() => {
    try {
      const carried = sessionStorage.getItem("qa_run_code");
      if (carried) {
        setCode(carried);
        const name = sessionStorage.getItem("qa_run_name");
        if (name) setTestName(name);
        sessionStorage.removeItem("qa_run_code");
        sessionStorage.removeItem("qa_run_name");
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  const busy = state.phase === "queued" || state.phase === "in_progress";
  const canRun = code.trim().length > 0 && !busy;
  const activeStep = stepIndex(state.phase);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Runs on isolated CI.</span>{" "}
        Paste a Playwright test (or send one over from Author) and it executes on an ephemeral GitHub
        Actions runner against our own site — never in your browser or on the app server. You get
        pass/fail, a summary, and a failure screenshot back.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              Base URL <span className="font-normal normal-case">(optional)</span>
            </span>
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} spellCheck={false}
              placeholder="https://your-site.example"
              className="text-[13px] px-3 py-2 rounded-lg outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              Test name <span className="font-normal normal-case">(optional)</span>
            </span>
            <input value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Home page smoke test"
              className="text-[13px] px-3 py-2 rounded-lg outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
            Playwright test (TypeScript)
          </span>
          <textarea value={code} onChange={e => setCode(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Paste a @playwright/test file, or click 'Use a sample'."
            rows={12} spellCheck={false}
            className="text-[12px] font-mono px-3 py-2.5 rounded-lg outline-none resize-y leading-relaxed"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { setCode(SAMPLE); reset(); }}
              className="text-[11px] underline underline-offset-2" style={{ color: "var(--text3)" }}>
              Use a sample
            </button>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>{code.length}/{MAX_CHARS}</span>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={() => run(code, baseUrl, testName)} disabled={!canRun}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {busy ? "Running…" : "Run test"}
          </button>
          {(state.phase === "completed" || state.phase === "error") && (
            <button onClick={reset}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {activeStep >= 0 && <Stepper active={activeStep} phase={state.phase} accent={accent} />}

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
          {state.runUrl && <> · <a href={state.runUrl} target="_blank" rel="noopener noreferrer" className="underline">view run</a></>}
        </div>
      )}

      {state.phase === "completed" && <Result state={state} accent={accent} />}
    </div>
  );
}

function Stepper({ active, phase, accent }: { active: number; phase: string; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < active || phase === "completed";
        const current = i === active && phase !== "completed" && phase !== "error";
        const on = done || current;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: on ? `${accent}18` : "var(--surface)",
                color: on ? accent : "var(--text3)",
                border: `1px solid ${on ? `${accent}45` : "var(--border)"}`,
              }}>
              {current
                ? <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: accent }} />
                : <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? accent : "var(--text3)" }} />}
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="w-5 h-px" style={{ background: "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Result({ state, accent }: { state: ReturnType<typeof useRun>["state"]; accent: string }) {
  const passed = state.passed === true;
  const color = passed ? "#34d399" : "#f43f5e";
  const s = state.summary;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{passed ? "Passed" : "Failed"}</span>
          {s && (
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
              {s.expected} passed · {s.unexpected} failed{s.flaky ? ` · ${s.flaky} flaky` : ""}{s.skipped ? ` · ${s.skipped} skipped` : ""}
            </span>
          )}
        </div>
        {state.runUrl && (
          <a href={state.runUrl} target="_blank" rel="noopener noreferrer"
            className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: `${accent}45`, color: accent }}>
            Full run · video &amp; trace
          </a>
        )}
      </div>
      {state.screenshot ? (
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text3)" }}>
            Failure screenshot
          </p>
          <img alt="Failure screenshot" src={`data:image/png;base64,${state.screenshot}`}
            className="w-full rounded-lg" style={{ border: "1px solid var(--border)" }} />
        </div>
      ) : (
        <div className="px-4 py-5 text-[12px]" style={{ color: "var(--text3)" }}>
          {passed
            ? "No screenshot — the test passed. Open the full run for the video and trace."
            : "No screenshot was captured for this failure."}
        </div>
      )}
    </div>
  );
}
