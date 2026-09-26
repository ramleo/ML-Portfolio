"use client";

import { useEffect, useRef, useState } from "react";
import { useRun } from "./useRun";
import { qaPost } from "../lib/qaClient";
import { Result, Stepper, HealBanner, lineDiff, stepIndex, type HealInfo } from "./ResultView";
import SavedAndHistory from "./SavedAndHistory";
import { saveTest, addHistory } from "./storage";
import { isFirstParty } from "../lib/ownership";
import OwnershipGate from "../lib/OwnershipGate";

type HealResp = { healed_code?: string; provider?: string | null; detail?: string | null };

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

export default function RunRunner({ accent }: { accent: string }) {
  const { state, run, reset } = useRun();
  const [code, setCode] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [testName, setTestName] = useState("");
  const [runs, setRuns] = useState(1);
  const [authorized, setAuthorized] = useState(false);
  const [healing, setHealing] = useState(false);
  const [healInfo, setHealInfo] = useState<HealInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const codeRef = useRef(code); codeRef.current = code;
  const nameRef = useRef(testName); nameRef.current = testName;
  const recorded = useRef(false);

  // Record every finished run into the browser-local history (once per run).
  useEffect(() => {
    if (state.phase === "queued") { recorded.current = false; return; }
    if ((state.phase === "completed" || state.phase === "error") && !recorded.current) {
      recorded.current = true;
      const status = state.phase === "error" ? "error" : state.passed ? "passed" : "failed";
      addHistory({ name: nameRef.current.trim() || "Untitled test", status, correlationId: state.correlationId, code: codeRef.current });
      setRefreshKey((k) => k + 1);
    }
  }, [state.phase, state.passed, state.correlationId]);

  const onHeal = async () => {
    if (!state.correlationId || healing) return;
    const original = code;
    setHealing(true);
    setHealInfo(null);
    try {
      const resp = await qaPost<HealResp>(
        "/qa/run/heal",
        { correlation_id: state.correlationId, code: original },
        { tool: "qa-heal" },
      );
      if (!resp.healed_code) {
        setHealInfo({ removed: [], added: [], error: resp.detail || "Could not heal this failure." });
        return;
      }
      const { removed, added } = lineDiff(original, resp.healed_code);
      setHealInfo({ provider: resp.provider ?? null, removed, added });
      setCode(resp.healed_code);
      run(resp.healed_code, baseUrl, testName, 1, authorized); // re-run the corrected test
    } catch (err) {
      setHealInfo({ removed: [], added: [], error: (err as Error).message || "Heal failed." });
    } finally {
      setHealing(false);
    }
  };

  const onSave = () => {
    if (!code.trim()) return;
    saveTest(testName, code);
    setRefreshKey((k) => k + 1);
  };

  const onLoad = (c: string, n: string) => { setCode(c); setTestName(n); reset(); setHealInfo(null); };
  const onRunSaved = (c: string, n: string) => { setCode(c); setTestName(n); setHealInfo(null); run(c, baseUrl, n, 1, authorized); };

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
  const thirdParty = !isFirstParty(baseUrl);
  const canRun = code.trim().length > 0 && !busy && (!thirdParty || authorized);
  const activeStep = stepIndex(state.phase);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Runs on isolated CI.</span>{" "}
        Paste a Playwright test (or send one over from Author) and it executes on an ephemeral GitHub
        Actions runner against a live site — never in your browser or on the app server. You get
        pass/fail, a summary, video, a trace, and self-healing back.
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

        <OwnershipGate show={thirdParty} checked={authorized} onChange={setAuthorized} accent={accent} />

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => run(code, baseUrl, testName, runs, authorized)} disabled={!canRun}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {busy ? "Running…" : runs > 1 ? `Check flakiness (${runs}×)` : "Run test"}
          </button>
          <label className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text3)" }}>
            <span className="uppercase tracking-wide font-semibold text-[11px]">Runs</span>
            <select value={runs} onChange={e => setRuns(Number(e.target.value))} disabled={busy}
              className="text-[12px] px-2 py-1.5 rounded-lg outline-none disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <option value={1}>1 (normal)</option>
              <option value={3}>3×</option>
              <option value={5}>5×</option>
              <option value={10}>10×</option>
            </select>
          </label>
          <button onClick={onSave} disabled={!code.trim()}
            className="text-[12px] px-3 py-2 rounded-lg border transition-opacity disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Save test
          </button>
          {(state.phase === "completed" || state.phase === "error") && (
            <button onClick={() => { reset(); setHealInfo(null); }}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {healInfo && <HealBanner info={healInfo} accent={accent} />}

      {activeStep >= 0 && <Stepper active={activeStep} phase={state.phase} accent={accent} />}

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
          {state.runUrl && <> · <a href={state.runUrl} target="_blank" rel="noopener noreferrer" className="underline">view run</a></>}
        </div>
      )}

      {state.phase === "completed" && (
        <Result state={state} accent={accent} onHeal={onHeal} healing={healing}
          healed={!!healInfo && !healInfo.error} onSave={onSave} />
      )}

      <SavedAndHistory accent={accent} refreshKey={refreshKey} onLoad={onLoad} onRun={onRunSaved} />
    </div>
  );
}
