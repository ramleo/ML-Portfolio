"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDiscover, readDiscoverCachedUrl, type Proposal } from "./useDiscover";
import { qaPost } from "../lib/qaClient";
import { isFirstParty } from "../lib/ownership";
import { modelFields } from "../lib/modelChoice";
import OwnershipGate from "../lib/OwnershipGate";

const DEFAULT_URL = "https://ml-portfolio-rho.vercel.app";

type Generated = { title: string; steps: string; code: string; error?: string };

/** Merge several generated test files into ONE runnable file: a single import and
 *  a single BASE_URL const, followed by every file's describe/test blocks. Naive
 *  concatenation would redeclare the import and BASE_URL and fail to compile. */
function mergeTests(drafts: Generated[]): string {
  let baseUrl = "";
  const bodies: string[] = [];
  for (const d of drafts) {
    if (!d.code) continue;
    const m = d.code.match(/const\s+BASE_URL\s*=\s*(['"`])(.*?)\1/);
    if (m && !baseUrl) baseUrl = m[2];
    const body = d.code
      .split("\n")
      .filter((l) => !/^\s*import\s.+@playwright\/test/.test(l) && !/^\s*const\s+BASE_URL\s*=/.test(l))
      .join("\n")
      .trim();
    if (body) bodies.push(body);
  }
  const header = "import { test, expect } from '@playwright/test';\n" +
    (baseUrl ? `\nconst BASE_URL = '${baseUrl}';\n` : "");
  return `${header}\n${bodies.join("\n\n")}\n`;
}

export default function DiscoverRunner({ accent }: { accent: string }) {
  const router = useRouter();
  const { state, discover, reset } = useDiscover();
  const [url, setUrl] = useState(DEFAULT_URL);

  // Restore the URL of a cached discovery after mount, so the field matches the
  // restored proposals (client-only — avoids an SSR hydration mismatch).
  useEffect(() => {
    const cached = readDiscoverCachedUrl();
    if (cached) setUrl(cached);
  }, []);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Generated[] | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [deep, setDeep] = useState(true);
  const [elapsed, setElapsed] = useState(0);        // discover timer (seconds)
  const [genTotal, setGenTotal] = useState(0);      // drafts requested this generate
  const [genElapsed, setGenElapsed] = useState(0);  // generate timer (seconds)

  const busy = state.phase === "queued" || state.phase === "in_progress";
  const proposals = state.proposals;
  const thirdParty = !isFirstParty(url);

  // Live elapsed timer while exploring on CI (same style as the Run stage).
  useEffect(() => {
    if (!busy) { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const onDiscover = () => {
    setSelected({});
    setGenerated(null);
    discover(url, authorized, deep);
  };

  const toggle = (i: number) => setSelected((s) => ({ ...s, [i]: !s[i] }));

  const chosen = (): Proposal[] => proposals.filter((_, i) => selected[i]);

  // Live elapsed timer while drafting tests (LLM calls, one per selected proposal).
  useEffect(() => {
    if (!generating) { setGenElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setGenElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [generating]);

  const onGenerate = async () => {
    const picks = chosen();
    if (!picks.length || generating) return;
    setGenerating(true);
    setGenTotal(picks.length);
    setGenerated([]);
    for (const p of picks) {
      try {
        const resp = await qaPost<{ code?: string; provider?: string | null }>(
          "/qa/author/generate",
          { instructions: p.steps, base_url: url.trim(), test_name: p.title,
            page_context: state.pageContext ?? "", ...modelFields() },
          { tool: "qa-test-author", meta: { via: "discover" } },
        );
        setGenerated((g) => [...(g ?? []), { title: p.title, steps: p.steps, code: resp?.code || "", error: resp?.code ? undefined : "No test generated — the page has no element this scenario needs (e.g. no contact form), so nothing could be grounded. Skipped rather than inventing a test that would fail." }]);
      } catch (err) {
        setGenerated((g) => [...(g ?? []), { title: p.title, steps: p.steps, code: "", error: (err as Error).message || "Failed." }]);
      }
    }
    setGenerating(false);
  };

  const sendToRun = (g: Generated) => {
    try {
      sessionStorage.setItem("qa_run_code", g.code);
      sessionStorage.setItem("qa_run_name", g.title);
      // Flag the handoff so Run can offer a way back to the proposals.
      sessionStorage.setItem("qa_run_from_discover", "1");
    } catch { /* ignore */ }
    router.push("/qa/run");
  };

  // Send every generated draft to Run as ONE merged test file (one run, many tests).
  const sendAllToRun = () => {
    const withCode = (generated ?? []).filter((g) => g.code);
    if (withCode.length < 2) return;
    try {
      sessionStorage.setItem("qa_run_code", mergeTests(withCode));
      sessionStorage.setItem("qa_run_name", `Discovered suite (${withCode.length})`);
      sessionStorage.setItem("qa_run_from_discover", "1");
    } catch { /* ignore */ }
    router.push("/qa/run");
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = proposals.length > 0 && selectedCount === proposals.length;
  const toggleAll = () => setSelected(allSelected ? {} : Object.fromEntries(proposals.map((_, i) => [i, true])));
  const genDone = generated?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Point it at a page.</span>{" "}
        Discover renders the URL on the isolated runner, reads its accessibility snapshot, and proposes
        test cases. Pick the ones you want and it drafts each as a Playwright test to send to Run.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>Page URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false}
            className="text-[13px] px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </label>
        <OwnershipGate show={thirdParty} checked={authorized} onChange={setAuthorized} accent={accent} />
        <label className="flex items-start gap-2 text-[12px] cursor-pointer" style={{ color: "var(--text2)" }}>
          <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} disabled={busy}
            className="mt-0.5 shrink-0" style={{ accentColor: accent }} />
          <span>Visit linked pages so generated tests are grounded in their real content, not guesses (recommended). Uncheck for a faster, single-page scan.</span>
        </label>
        <div className="flex items-center gap-3">
          <button onClick={onDiscover} disabled={!url.trim() || busy || (thirdParty && !authorized)}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {busy ? "Exploring…" : "Discover test cases"}
          </button>
          {(state.phase === "completed" || state.phase === "error") && (
            <button onClick={() => { reset(); setGenerated(null); setSelected({}); }}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {busy && (
        <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            {["Queued", "Exploring", "Proposals"].map((lbl, i) => {
              const active = i === (state.phase === "in_progress" ? 1 : 0);
              const on = i <= (state.phase === "in_progress" ? 1 : 0);
              return (
                <div key={lbl} className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: on ? `${accent}18` : "var(--surface)", color: on ? accent : "var(--text3)", border: `1px solid ${on ? `${accent}45` : "var(--border)"}` }}>
                    {active
                      ? <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: accent }} />
                      : <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? accent : "var(--text3)" }} />}
                    {lbl}
                  </span>
                  {i < 2 && <span className="w-5 h-px" style={{ background: "var(--border)" }} />}
                </div>
              );
            })}
          </div>
          <p className="text-[12px] tabular-nums" style={{ color: "var(--text3)" }}>
            Exploring the page on GitHub CI · {elapsed}s · first-run setup on a fresh CI runner takes ~40–60s
            {state.runUrl && <>{" · "}<a href={state.runUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>Open on GitHub</a></>}
          </p>
        </div>
      )}

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
        </div>
      )}

      {state.phase === "completed" && proposals.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b flex-wrap" style={{ borderColor: "var(--border)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Proposed test cases ({proposals.length})</span>
            <div className="flex items-center gap-2">
              <button onClick={toggleAll} disabled={generating}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-opacity disabled:opacity-40"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                {allSelected ? "Clear all" : "Select all"}
              </button>
              <button onClick={onGenerate} disabled={!selectedCount || generating}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
                style={{ background: accent, color: "#fff" }}>
                {generating ? `Drafting ${genDone}/${genTotal}…` : `Generate selected (${selectedCount})`}
              </button>
            </div>
          </div>
          <ul>
            {proposals.map((p, i) => (
              <li key={i} className="flex gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <input type="checkbox" checked={!!selected[i]} onChange={() => toggle(i)} className="mt-0.5 shrink-0" style={{ accentColor: accent }} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{p.title}</p>
                  <p className="text-[12px] leading-relaxed mt-0.5" style={{ color: "var(--text2)" }}>{p.steps}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {generated && generated.filter((g) => g.code).length > 1 && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-[12px]"
          style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
          <span>{generated.filter((g) => g.code).length} drafts generated — run them together as one suite.</span>
          <button onClick={sendAllToRun}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: accent, color: "#fff" }}>
            Send all {generated.filter((g) => g.code).length} to Run →
          </button>
        </div>
      )}

      {generated && generated.map((g, i) => (
        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{g.title}</span>
            {g.code && (
              <button onClick={() => sendToRun(g)} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: accent, color: "#fff" }}>Send to Run →</button>
            )}
          </div>
          {g.error ? (
            <p className="px-4 py-3 text-[12px]" style={{ color: "#dc2626" }}>{g.error}</p>
          ) : (
            <pre className="text-[12px] leading-relaxed overflow-x-auto px-4 py-3 m-0" style={{ color: "var(--text2)" }}><code>{g.code}</code></pre>
          )}
        </div>
      ))}
      {generating && (
        <p className="text-[12px] tabular-nums" style={{ color: "var(--text3)" }}>
          Drafting test {Math.min(genDone + 1, genTotal)} of {genTotal} · {genElapsed}s
        </p>
      )}
    </div>
  );
}
