"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ModelCompare, { type ModelPerf } from "./ModelCompare";
import EvalItemTable, { type Score, itemPass } from "./EvalItemTable";
import { Panel } from "./charts/Panel";
import LineChart from "./charts/LineChart";
import { C, PRIMARY, pct, pct0, when } from "./charts/format";

/** Q4 M2 — answer-quality section: pass-rate trend across runs, model comparison, the
 * latest run's per-item verdicts (worst-first) and an owner "Run evaluation" button
 * that triggers a run and polls until it lands. Owner-only. */

interface Run {
  id: string; ts: string; golden_version: string; judge_model: string | null;
  gen_provider: string | null; gen_model: string | null;
  status: string; n: number; n_scored: number; pass_rate: number | null;
  avg_correct: number | null; avg_faithful: number | null; avg_relevant: number | null; error: string | null;
}
interface Quality { needs_setup?: boolean; runs: Run[]; latest: Run | null; scores: Score[] }

/** The app's generation models the eval can score (mirrors the server allowlist). */
const MODELS = [
  { key: "cohere/command-a-03-2025", label: "Cohere · command-a" },
  { key: "gemini/gemini-3.6-flash", label: "Gemini · 3.6-flash" },
  { key: "mistral/mistral-small-latest", label: "Mistral · small" },
  { key: "groq/gpt-oss-20b", label: "Groq · gpt-oss-20b (free)" },
  { key: "groq/gpt-oss-120b", label: "Groq · gpt-oss-120b (free)" },
];

const INFO = "A fixed golden set of questions is run through the real RAG pipeline and scored by an LLM judge (Gemini — a different family from the Cohere generator, to limit self-preference). Each answer is judged Correct / Faithful / Relevant; Pass = all three. Running a model spends a few cents (one judge call per item).";

/** Shown the instant a run is in flight. Indeterminate until the first item scores
 * (a real item takes ~10s), determinate (n_scored/n) once progress arrives. */
function ScoringBar({ row }: { row: Run | undefined }) {
  const total = row?.n ?? 0, done = row?.n_scored ?? 0;
  const determinate = total > 0 && done > 0;
  return (
    <div style={{ margin: "0 0 16px" }}>
      <style>{"@keyframes evalIndet{0%{left:-40%}100%{left:100%}}"}</style>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text2)", marginBottom: 4 }}>
        <span>Scoring…</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{total > 0 ? `${done}/${total}` : "preparing…"}</span>
      </div>
      <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        {determinate
          ? <div style={{ width: `${Math.round((done / total) * 100)}%`, height: "100%", background: PRIMARY, transition: "width .4s ease" }} />
          : <div style={{ position: "absolute", top: 0, bottom: 0, width: "40%", background: PRIMARY, borderRadius: 4, animation: "evalIndet 1.1s ease-in-out infinite" }} />}
      </div>
    </div>
  );
}

/** Pass-rate trend across runs of the SAME golden version (different versions aren't
 * comparable). Needs ≥2 points — a single run is covered by the model comparison. */
function PassTrend({ runs }: { runs: Run[] }) {
  const doneAll = runs.filter((r) => r.status === "done" && r.pass_rate != null);
  const ver = doneAll[0]?.golden_version;
  const done = doneAll.filter((r) => r.golden_version === ver).slice().reverse();
  if (done.length < 2) return null;
  const last = done[done.length - 1];
  return (
    <div style={{ margin: "0 0 18px", padding: "12px 14px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: 0 }}>Pass rate across runs <span style={{ textTransform: "none" }}>· {ver}</span></p>
        <span style={{ fontSize: 11.5, color: "var(--text3)", fontVariantNumeric: "tabular-nums" }}>latest {pct0(last.pass_rate)}</span>
      </div>
      <LineChart series={[{ name: "pass rate", color: PRIMARY, values: done.map((r) => r.pass_rate) }]}
        xLabels={done.map((r) => r.ts.slice(5, 10))} yFormat={(v) => pct0(v)} yMax={1} area height={120} />
    </div>
  );
}

export default function EvalQuality({ perf = [] }: { perf?: ModelPerf[] }) {
  const [data, setData] = useState<Quality | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].key);
  const [startedId, setStartedId] = useState<string | null>(null);
  const [pickedModel, setPickedModel] = useState<string | null>(null);
  const [extraScores, setExtraScores] = useState<Record<string, Score[]>>({});
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/eval/quality", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch { /* keep last */ }
  }, []);

  useEffect(() => {
    (async () => { await load(); })();
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [load]);

  const startedRow = startedId ? data?.runs?.find((r) => r.id === startedId) : undefined;
  const inflight = startedId !== null && startedRow?.status !== "done" && startedRow?.status !== "error";
  const running = data?.latest?.status === "running";
  const active = running || inflight;

  useEffect(() => {
    if (active && !poll.current) poll.current = setInterval(load, 2500);
    if (!active && poll.current) { clearInterval(poll.current); poll.current = null; }
  }, [active, load]);

  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/eval/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model }) });
      const d = await res.json();
      if (!res.ok) setMsg(d.error ?? "Could not start the run.");
      else { setStartedId(d.run_id); setMsg(null); await load(); }
    } catch { setMsg("Could not reach the server."); }
    setBusy(false);
  };

  const latest = data?.latest;
  const doneRuns = (data?.runs ?? []).filter((r) => r.status === "done" && r.gen_model && r.pass_rate != null);
  const latestRunByModel = new Map<string, Run>();
  for (const r of doneRuns) if (!latestRunByModel.has(r.gen_model as string)) latestRunByModel.set(r.gen_model as string, r);
  const modelsWithRuns = [...latestRunByModel.keys()];
  const activeModel = (pickedModel && latestRunByModel.has(pickedModel) ? pickedModel : null) ?? latest?.gen_model ?? modelsWithRuns[0] ?? null;
  const shownRun: Run | null = (activeModel ? latestRunByModel.get(activeModel) : undefined) ?? latest ?? null;
  const usingLatest = !!shownRun && !!latest && shownRun.id === latest.id;

  useEffect(() => {
    if (shownRun && !usingLatest && !extraScores[shownRun.id]) {
      const id = shownRun.id;
      (async () => {
        try {
          const res = await fetch(`/api/eval/scores?run=${id}`, { cache: "no-store" });
          if (res.ok) { const d = await res.json(); setExtraScores((s) => ({ ...s, [id]: d.scores as Score[] })); }
        } catch { /* ignore */ }
      })();
    }
  }, [shownRun, usingLatest, extraScores]);

  const rawScores: Score[] | null = usingLatest ? (data?.scores ?? []) : (shownRun ? extraScores[shownRun.id] ?? null : null);
  const scores = (rawScores ?? []).slice().sort((a, b) => Number(itemPass(a)) - Number(itemPass(b)));

  const controls = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy || active} aria-label="Model to evaluate"
        style={{ padding: "0.35rem 0.6rem", fontSize: 13, borderRadius: 9999, border: "1px solid var(--border2)", background: "var(--bg-card)", color: "var(--text)", cursor: busy || active ? "default" : "pointer" }}>
        {MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      <button type="button" onClick={run} disabled={busy || active}
        style={{ padding: "0.35rem 0.9rem", fontSize: 13, fontWeight: 600, cursor: busy || active ? "default" : "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: busy || active ? "var(--bg)" : "var(--accent)", color: busy || active ? "var(--text3)" : "#fff" }}>
        {active ? "Scoring…" : busy ? "Starting…" : "Run evaluation"}
      </button>
    </div>
  );

  const picker = modelsWithRuns.length > 1 ? (
    <select value={activeModel ?? ""} onChange={(e) => setPickedModel(e.target.value)} aria-label="Model to view per-item results for"
      style={{ fontSize: 12.5, fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg-card)", color: "var(--text)", cursor: "pointer" }}>
      {modelsWithRuns.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  ) : <strong style={{ fontSize: 12.5, color: "var(--text2)" }}>{shownRun?.gen_model ?? "—"}</strong>;

  return (
    <Panel title="Answer quality · golden set + LLM judge" info={INFO} right={controls}>
      {msg && <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "0 0 12px" }}>{msg}</p>}

      {/* Progress sits directly under the header, beside the Scoring… button —
          not buried further down the panel. */}
      {active && <ScoringBar row={startedRow ?? (running ? latest ?? undefined : undefined)} />}

      {!data ? <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p>
        : data.needs_setup ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up yet — run <code>supabase/eval.sql</code>, then start a run.</p>
        : !latest ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No runs yet. Click <strong>Run evaluation</strong> to score the golden set.</p>
        : (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 4px" }}>Pass rate</p>
                <p style={{ fontFamily: "var(--type-display)", fontSize: 30, fontWeight: 700, margin: 0, color: "var(--text)" }}>{pct(latest.pass_rate)}</p>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7 }}>
                <div>correct {pct0(latest.avg_correct)} · faithful {pct0(latest.avg_faithful)} · relevant {pct0(latest.avg_relevant)}</div>
                <div style={{ color: "var(--text3)" }}>
                  model <strong style={{ color: "var(--text2)" }}>{latest.gen_model ?? "—"}</strong> · {latest.status === "running" ? "running…" : `${latest.n_scored}/${latest.n} scored`} · {when(latest.ts)} · judge {latest.judge_model ?? "—"} · {latest.golden_version}
                  {latest.status === "error" && <span style={{ color: C.err }}> · error: {latest.error}</span>}
                </div>
              </div>
            </div>

            <PassTrend runs={data.runs} />
            <div style={{ margin: "0 0 18px" }}><ModelCompare runs={data.runs} perf={perf} /></div>

            {shownRun && (
              <EvalItemTable scores={scores} loading={rawScores === null} picker={picker}
                meta={`${shownRun.golden_version} · ${when(shownRun.ts)} · judge ${shownRun.judge_model ?? "—"} · worst-first`} />
            )}
          </>
        )}
    </Panel>
  );
}
