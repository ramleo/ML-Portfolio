"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthor } from "./useAuthor";

const DEFAULT_BASE_URL = "https://ml-portfolio-rho.vercel.app";

const SAMPLE =
  "Open the home page. Click the link that goes to the tools section. " +
  "Check that the page heading for the tools is visible. " +
  "Find the search box, type \"anomaly\", and confirm at least one result card appears.";

const MAX_CHARS = 4000;

export default function AuthorRunner({ accent }: { accent: string }) {
  const router = useRouter();
  const { generate, running, result, error, reset } = useAuthor();
  const [steps, setSteps] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [testName, setTestName] = useState("");
  const [copied, setCopied] = useState(false);

  const onSendToRun = () => {
    if (!result?.code) return;
    try {
      sessionStorage.setItem("qa_run_code", result.code);
      if (testName.trim()) sessionStorage.setItem("qa_run_name", testName.trim());
    } catch { /* sessionStorage unavailable — Run page just starts empty */ }
    router.push("/qa/run");
  };

  const canRun = steps.trim().length > 0 && !running;

  const onGenerate = () => {
    if (!canRun) return;
    setCopied(false);
    generate(steps, baseUrl, testName);
  };

  const onCopy = async () => {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Authoring.</span>{" "}
        This writes a Playwright test in TypeScript from your description. When it&apos;s ready,
        hit <span className="font-semibold" style={{ color: "var(--text)" }}>Send to Run</span> to
        execute it here on isolated CI, or copy it into your own Playwright project.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
              Base URL <span className="font-normal normal-case">(optional)</span>
            </span>
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://your-site.example" spellCheck={false}
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
            What should the test check?
          </span>
          <textarea value={steps} onChange={e => setSteps(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Describe the steps in plain English, e.g. Open the pricing page, click Sign up, and check the email field is required."
            rows={6}
            className="text-[13px] px-3 py-2.5 rounded-lg outline-none resize-y leading-relaxed"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { setSteps(SAMPLE); reset(); }}
              className="text-[11px] underline underline-offset-2" style={{ color: "var(--text3)" }}>
              Use a sample
            </button>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>{steps.length}/{MAX_CHARS}</span>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={onGenerate} disabled={!canRun}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Generating…" : "Generate test"}
          </button>
          {result && (
            <button onClick={() => { setSteps(""); setTestName(""); reset(); }}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {result?.code && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Playwright · TypeScript</span>
              {result.provider && (
                <span className="text-[9px] px-2 py-[2px] rounded-full font-bold uppercase tracking-wider"
                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>{result.provider}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSendToRun} className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: accent, color: "#fff" }}>Send to Run →</button>
              <button onClick={onCopy} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: `${accent}45`, color: accent }}>{copied ? "Copied" : "Copy"}</button>
            </div>
          </div>
          <pre className="text-[12px] leading-relaxed overflow-x-auto px-4 py-3.5 m-0" style={{ color: "var(--text2)" }}>
            <code>{result.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
