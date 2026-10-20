"use client";

import { useEffect, useState } from "react";

/** Q4 (live RAG health) — reads /api/eval/rag (aggregates of the content-free
 * rag_queries log): cache-hit rate, answer-source mix, groundedness (avg + daily
 * drift), low-confidence and web-fallback rates. Decomposed by stage, per the
 * guidance that a faithful answer can still hide a retrieval problem. */

interface Day { date: string; groundedness: number | null }
interface Rag {
  needs_setup?: boolean; total: number;
  cache_hit_rate: number | null; low_confidence_rate: number | null; web_fallback_rate: number | null;
  avg_groundedness: number | null; sources: { name: string; count: number }[]; daily: Day[];
}

const ACCENT = "var(--accent)";
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "16px 18px" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "var(--type-display)", fontSize: 23, fontWeight: 700, color: "var(--text)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text3)", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function SourceMix({ sources, total }: { sources: { name: string; count: number }[]; total: number }) {
  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: "0 0 14px", color: "var(--text)" }}>Answer source</h3>
      {sources.length === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No data.</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {sources.map((s) => (
            <div key={s.name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: "var(--text)" }}>{s.name}</span>
                <span style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{s.count} · {total ? Math.round((s.count / total) * 100) : 0}%</span>
              </div>
              <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${total ? (s.count / total) * 100 : 0}%`, height: "100%", background: ACCENT }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroundTrend({ daily }: { daily: Day[] }) {
  const vals = daily.map((d) => d.groundedness);
  const nums = vals.filter((v): v is number => v != null);
  const W = 520, H = 120, padL = 8, padR = 8, padB = 16, padT = 8;
  const nLen = daily.length;
  const x = (i: number) => padL + (nLen <= 1 ? 0 : (i / (nLen - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v) * (H - padT - padB);   // groundedness is 0..1
  const pts: string[] = [];
  vals.forEach((v, i) => { if (v != null) pts.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`); });
  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: "0 0 10px", color: "var(--text)" }}>Groundedness per day</h3>
      {nums.length === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No scored answers yet.</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Groundedness per day" preserveAspectRatio="none">
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border2)" strokeWidth={1} />
          {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {vals.map((v, i) => v != null && (
            <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={ACCENT}><title>{`${daily[i].date}: ${Math.round(v * 100)}%`}</title></circle>
          ))}
        </svg>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text3)" }}>
        <span>{daily[0]?.date.slice(5)}</span><span>{daily[daily.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function EvalRagHealth({ days }: { days: number }) {
  const [data, setData] = useState<Rag | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setData(null); setFailed(false);
      try {
        const res = await fetch(`/api/eval/rag?days=${days}`, { cache: "no-store" });
        if (!active) return;
        if (res.ok) setData(await res.json()); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [days]);

  if (failed) return <div style={card}><p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>Couldn&apos;t load RAG health.</p></div>;
  if (!data) return <div style={card}><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></div>;
  if (data.needs_setup) return <div style={card}><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up — run <code>supabase/rag_queries.sql</code>. Logging starts once the Space redeploys.</p></div>;
  if (!data.total) return <div style={card}><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No RAG queries logged in this window yet — ask the chat a question, then refresh.</p></div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: 0, lineHeight: 1.5 }}>
        Every time anyone asks the site chat a question, one content-free row is logged (no question or answer text) — this fills in as the chat is used.
        {" "}<strong>Cache hit rate</strong>: share answered from cache with no LLM call.
        {" "}<strong>Avg groundedness</strong>: how well answers are backed by the retrieved context (higher = less made up).
        {" "}<strong>Low confidence</strong> / <strong>web fallback</strong>: share of queries the retriever was unsure about or had to answer from the web.
        {" "}<strong>Answer source</strong>: where answers came from (knowledge base / web / dataset).
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Stat label="RAG queries" value={data.total.toLocaleString()} />
        <Stat label="Cache hit rate" value={pct(data.cache_hit_rate)} sub="answered without an LLM call" />
        <Stat label="Avg groundedness" value={pct(data.avg_groundedness)} sub="answer supported by context" />
        <Stat label="Low confidence" value={pct(data.low_confidence_rate)} />
        <Stat label="Web fallback" value={pct(data.web_fallback_rate)} />
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <SourceMix sources={data.sources} total={data.total} />
        <GroundTrend daily={data.daily} />
      </div>
    </div>
  );
}
