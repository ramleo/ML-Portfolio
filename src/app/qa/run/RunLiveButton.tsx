"use client";

import { useCallback, useEffect, useState } from "react";

/** Phase-2 MVP — "Run Live": run the authored test on the user's OWN machine,
 *  headed, so they can watch it (the local sibling of the CI run). A website
 *  can't launch a local browser, so this talks to the Testwright Companion — a
 *  small daemon the user runs (`npx @airaml/testwright-companion`) that listens
 *  on localhost, opens a real browser, runs the test, and returns pass/fail.
 *
 *  HTTPS→http://127.0.0.1 is allowed by browsers (localhost is a trustworthy
 *  origin), so the fetch works from the deployed site. If the companion isn't
 *  running the health ping fails and we show how to start it. */

const COMPANION = "http://127.0.0.1:8787";
const CMD = "npx @airaml/testwright-companion";

type LiveResult = { passed: boolean | null; total?: number; failed?: number; output?: string; error?: string };

async function ping(path: string, init?: RequestInit, ms = 2500): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(COMPANION + path, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

export default function RunLiveButton({ code, baseUrl, testName, accent }: {
  code: string; baseUrl: string; testName: string; accent: string;
}) {
  const [up, setUp] = useState<boolean | null>(null); // null = checking
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [copied, setCopied] = useState(false);

  const check = useCallback(async () => {
    try { const r = await ping("/health"); setUp(r.ok); }
    catch { setUp(false); }
  }, []);

  useEffect(() => { check(); }, [check]);

  const runLive = useCallback(async () => {
    if (!code.trim()) return;
    setRunning(true); setResult(null);
    try {
      const r = await ping("/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, base_url: baseUrl, test_name: testName }),
      }, 180000); // a headed run can take a while
      const j: LiveResult = await r.json();
      setResult(j); setUp(true);
    } catch {
      setUp(false);
      setResult({ passed: null, error: "Couldn't reach the companion — is it still running?" });
    } finally { setRunning(false); }
  }, [code, baseUrl, testName]);

  const copy = () => { navigator.clipboard?.writeText(CMD).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={runLive}
          disabled={!code.trim() || running || up === false}
          title={up === false ? "Start the Testwright Companion first" : "Run on your machine and watch it live"}
          className="text-[13px] font-semibold px-4 py-2 rounded-lg border transition-opacity disabled:opacity-40"
          style={{ borderColor: accent, color: accent }}>
          {running ? "Running locally…" : "Run Live ▶"}
        </button>
        <span className="text-[11px]" style={{ color: "var(--text3)" }}>
          {up === null ? "checking for companion…"
            : up ? "● companion ready — opens a browser on your machine"
            : "○ companion not running"}
        </span>
        {up === false && (
          <button onClick={check} className="text-[11px] underline" style={{ color: "var(--text3)" }}>recheck</button>
        )}
      </div>

      {up === false && (
        <div className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: "var(--text3)" }}>
          <span>To watch tests run on your machine, start the companion:</span>
          <code className="px-2 py-0.5 rounded font-mono" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>{CMD}</code>
          <button onClick={copy} className="underline" style={{ color: accent }}>{copied ? "copied" : "copy"}</button>
        </div>
      )}

      {result && (
        <div className="text-[12px]" style={{ color: result.error ? "#dc2626" : result.passed ? "#16a34a" : "#dc2626" }}>
          {result.error
            ? result.error
            : result.passed === null
              ? "Ran locally — check the browser window / output."
              : result.passed
                ? `Passed locally ✓ (${result.total ?? 1} test${(result.total ?? 1) === 1 ? "" : "s"})`
                : `Failed locally ✗ (${result.failed ?? 1} of ${result.total ?? 1})`}
        </div>
      )}
    </div>
  );
}
