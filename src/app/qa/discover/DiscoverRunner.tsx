"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDiscover, type Proposal } from "./useDiscover";
import { qaPost } from "../lib/qaClient";
import { isFirstParty } from "../lib/ownership";
import OwnershipGate from "../lib/OwnershipGate";

const DEFAULT_URL = "https://ml-portfolio-rho.vercel.app";

type Generated = { title: string; steps: string; code: string; error?: string };

export default function DiscoverRunner({ accent }: { accent: string }) {
  const router = useRouter();
  const { state, discover, reset } = useDiscover();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Generated[] | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const busy = state.phase === "queued" || state.phase === "in_progress";
  const proposals = state.proposals;
  const thirdParty = !isFirstParty(url);

  const onDiscover = () => {
    setSelected({});
    setGenerated(null);
    discover(url, authorized);
  };

  const toggle = (i: number) => setSelected((s) => ({ ...s, [i]: !s[i] }));

  const chosen = (): Proposal[] => proposals.filter((_, i) => selected[i]);

  const onGenerate = async () => {
    const picks = chosen();
    if (!picks.length || generating) return;
    setGenerating(true);
    setGenerated([]);
    for (const p of picks) {
      try {
        const resp = await qaPost<{ code?: string; provider?: string | null }>(
          "/qa/author/generate",
          { instructions: p.steps, base_url: url.trim(), test_name: p.title },
          { tool: "qa-test-author", meta: { via: "discover" } },
        );
        setGenerated((g) => [...(g ?? []), { title: p.title, steps: p.steps, code: resp?.code || "", error: resp?.code ? undefined : "No test returned." }]);
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
    } catch { /* ignore */ }
    router.push("/qa/run");
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

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
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Rendering the page and reading its structure on the runner — about a minute.
        </p>
      )}

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
        </div>
      )}

      {state.phase === "completed" && proposals.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Proposed test cases ({proposals.length})</span>
            <button onClick={onGenerate} disabled={!selectedCount || generating}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: accent, color: "#fff" }}>
              {generating ? "Drafting…" : `Generate selected (${selectedCount})`}
            </button>
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
      {generating && <p className="text-[12px]" style={{ color: "var(--text3)" }}>Drafting tests…</p>}
    </div>
  );
}
