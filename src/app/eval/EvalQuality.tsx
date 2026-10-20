"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Q4 M2 — quality scoring section: pass-rate trend over runs, the latest run's
 * per-item verdicts (worst-first), and an owner "Run evaluation" button that
 * triggers a run and polls until it lands. Content here is the owner's own golden
 * set + the system's answers to it — owner-only. */

interface Run {
  id: string; ts: string; golden_version: string; judge_model: string | null;
  gen_provider: string | null; gen_model: string | null;
  status: string; n: number; n_scored: number; pass_rate: number | null;
  avg_correct: number | null; avg_faithful: number | null; avg_relevant: number | null; error: string | null;
}

/** The app's generation models the eval can score (mirrors the server allowlist). */
const MODELS = [
  { key: "cohere/command-a-03-2025", label: "Cohere · command-a" },
  { key: "gemini/gemini-3.6-flash", label: "Gemini · 3.6-flash" },
  { key: "mistral/mistral-small-latest", label: "Mistral · small" },
];
interface Score {
  item_id: string; question: string; answer: string | null;
  correct: boolean | null; faithful: boolean | null; relevant: boolean | null;
  groundedness: number | null; rationale: string | null;
}
interface Quality { needs_setup?: boolean; runs: Run[]; latest: Run | null; scores: Score[] }

const ACCENT = "var(--accent)";
const ERR = "#f87171";
const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "18px 20px" };
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const when = (ts: string) => ts.slice(0, 16).replace("T", " ");
const itemPass = (s: Score) => s.correct === true && s.faithful === true && s.relevant === true;

function Mark({ v }: { v: boolean | null }) {
  if (v == null) return <span style={{ color: "var(--text3)" }}>—</span>;
  return <span style={{ color: v ? "var(--text2)" : ERR, fontWeight: 600 }}>{v ? "✓" : "✗"}</span>;
}

function PassTrend({ runs }: { runs: Run[] }) {
  const done = runs.filter((r) => r.status === "done" && r.pass_rate != null).slice().reverse();
  if (done.length < 2) return null;
  const W = 240, H = 40;
  const x = (i: number) => (i / (done.length - 1)) * W;
  const y = (v: number) => H - v * H;
  const pts = done.map((r, i) => `${x(i).toFixed(1)},${y(r.pass_rate!).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Pass-rate trend" style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(done.length - 1)} cy={y(done[done.length - 1].pass_rate!)} r={3} fill={ACCENT} />
    </svg>
  );
}

export default function EvalQuality() {
  const [data, setData] = useState<Quality | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].key);
  const [startedId, setStartedId] = useState<string | null>(null);
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

  // A run I just started counts as in-flight until the data shows that run_id
  // finished — this keeps the button/message honest during the gap before the
  // first poll reflects the new row (otherwise the button says "Run evaluation"
  // while the message says "Scoring…").
  const startedRow = startedId ? data?.runs?.find((r) => r.id === startedId) : undefined;
  const inflight = startedId !== null && startedRow?.status !== "done" && startedRow?.status !== "error";
  const running = data?.latest?.status === "running";
  const active = running || inflight;

  useEffect(() => {
    if (active && !poll.current) poll.current = setInterval(load, 5000);
    if (!active && poll.current) { clearInterval(poll.current); poll.current = null; }
  }, [active, load]);

  const run = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/eval/run", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model }),
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error ?? "Could not start the run.");
      else { setStartedId(d.run_id); setMsg(null); await load(); }
    } catch { setMsg("Could not reach the server."); }
    setBusy(false);
  };

  // Latest completed pass-rate per generation model, for a quick comparison.
  const byModel = (() => {
    const seen = new Map<string, Run>();
    for (const r of data?.runs ?? [])
      if (r.status === "done" && r.gen_model && !seen.has(r.gen_model)) seen.set(r.gen_model, r);
    return [...seen.values()];
  })();

  const latest = data?.latest;
  const scores = (data?.scores ?? []).slice().sort((a, b) => Number(itemPass(a)) - Number(itemPass(b)));
  const th: React.CSSProperties = { textAlign: "left", padding: "6px 9px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)" };
  const td: React.CSSProperties = { padding: "6px 9px", fontSize: 12.5, borderTop: "1px solid var(--border)", verticalAlign: "top" };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>Answer quality <span style={{ color: "var(--text3)", fontWeight: 400 }}>· golden set + LLM judge</span></h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy || active} aria-label="Model to evaluate"
            style={{ padding: "0.35rem 0.6rem", fontSize: 13, borderRadius: 9999, border: "1px solid var(--border2)", background: "var(--bg-card)", color: "var(--text)", cursor: busy || active ? "default" : "pointer" }}>
            {MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button type="button" onClick={run} disabled={busy || active}
            style={{ padding: "0.35rem 0.9rem", fontSize: 13, fontWeight: 600, cursor: busy || active ? "default" : "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: busy || active ? "var(--bg)" : ACCENT, color: busy || active ? "var(--text3)" : "#fff" }}>
            {active ? "Scoring…" : busy ? "Starting…" : "Run evaluation"}
          </button>
        </div>
      </div>

      {msg && <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "0 0 12px" }}>{msg}</p>}

      {!data ? <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p>
        : data.needs_setup ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up yet — run <code>supabase/eval.sql</code>, then start a run.</p>
        : !latest ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No runs yet. Click <strong>Run evaluation</strong> to score the golden set.</p>
        : (
          <>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 4px" }}>Pass rate</p>
                <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{pct(latest.pass_rate)}</p>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7 }}>
                <div>correct {pct(latest.avg_correct)} · faithful {pct(latest.avg_faithful)} · relevant {pct(latest.avg_relevant)}</div>
                <div style={{ color: "var(--text3)" }}>
                  model <strong style={{ color: "var(--text2)" }}>{latest.gen_model ?? "—"}</strong> · {latest.status === "running" ? "running…" : `${latest.n_scored}/${latest.n} scored`} · {when(latest.ts)} · judge {latest.judge_model ?? "—"} · {latest.golden_version}
                  {latest.status === "error" && <span style={{ color: ERR }}> · error: {latest.error}</span>}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}><PassTrend runs={data.runs} /></div>
            </div>

            {byModel.length >= 2 && (
              <div style={{ margin: "0 0 16px", padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 8px" }}>Latest pass rate by model</p>
                <div style={{ display: "grid", gap: 6 }}>
                  {byModel.sort((a, b) => (b.pass_rate ?? 0) - (a.pass_rate ?? 0)).map((r) => (
                    <div key={r.gen_model} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                      <span style={{ width: 170, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.gen_model}</span>
                      <span style={{ flex: 1, height: 8, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                        <span style={{ display: "block", width: `${Math.round((r.pass_rate ?? 0) * 100)}%`, height: "100%", background: ACCENT }} />
                      </span>
                      <span style={{ width: 42, textAlign: "right", color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{pct(r.pass_rate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latest.status === "running" && (
              <div style={{ margin: "0 0 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text2)", marginBottom: 4 }}>
                  <span>Scoring…</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{latest.n_scored}/{latest.n || "?"}</span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${latest.n ? Math.round((latest.n_scored / latest.n) * 100) : 0}%`, height: "100%", background: ACCENT, transition: "width .4s ease" }} />
                </div>
              </div>
            )}

            {scores.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Question</th><th style={th}>C</th><th style={th}>F</th><th style={th}>R</th><th style={th}>Judge note</th></tr></thead>
                  <tbody>
                    {scores.map((s) => (
                      <tr key={s.item_id} style={{ background: itemPass(s) ? "transparent" : "color-mix(in srgb, #f87171 7%, transparent)" }}>
                        <td style={{ ...td, maxWidth: 260 }}>{s.question}</td>
                        <td style={td}><Mark v={s.correct} /></td>
                        <td style={td}><Mark v={s.faithful} /></td>
                        <td style={td}><Mark v={s.relevant} /></td>
                        <td style={{ ...td, color: "var(--text3)", maxWidth: 320 }}>{s.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
    </div>
  );
}
