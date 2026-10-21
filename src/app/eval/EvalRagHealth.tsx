"use client";

import { useEffect, useState } from "react";
import { Panel, StatTile } from "./charts/Panel";
import { BarList, type BarDatum } from "./charts/Bars";
import LineChart from "./charts/LineChart";
import { C, PRIMARY, pct0, mmdd, n } from "./charts/format";

/** Live RAG health — online monitoring of the real chat from the content-free
 * rag_queries log: cache-hit rate, answer-source mix, groundedness (avg + daily
 * drift), low-confidence and web-fallback rates. A faithful answer can still hide a
 * retrieval problem, so it's decomposed by stage. No question or answer text. */

interface Day { date: string; groundedness: number | null }
interface Rag {
  needs_setup?: boolean; total: number;
  cache_hit_rate: number | null; low_confidence_rate: number | null; web_fallback_rate: number | null;
  avg_groundedness: number | null; sources: { name: string; count: number }[]; daily: Day[];
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

  if (failed) return <Panel title="Live RAG health"><p style={{ fontSize: 13, color: C.err, margin: 0 }}>Couldn&apos;t load RAG health.</p></Panel>;
  if (!data) return <Panel title="Live RAG health"><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></Panel>;
  if (data.needs_setup) return <Panel title="Live RAG health"><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up — run <code>supabase/rag_queries.sql</code>. Logging starts once the Space redeploys.</p></Panel>;
  if (!data.total) return <Panel title="Live RAG health"><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No RAG queries logged in this window yet — ask the chat a question, then refresh.</p></Panel>;

  const total = data.total;
  const sources: BarDatum[] = data.sources.map((s) => ({
    key: s.name, label: s.name, max: total, segs: [{ value: s.count, color: PRIMARY }],
    value: <>{n(s.count)} · {total ? Math.round((s.count / total) * 100) : 0}%</>,
    tip: <div><strong style={{ color: "var(--text)" }}>{s.name}</strong><div>{n(s.count)} of {n(total)} queries</div></div>,
  }));
  const ground = data.daily.map((d) => d.groundedness);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: 0, lineHeight: 1.55 }}>
        Every time anyone asks the site chat a question, one content-free row is logged (no question or answer text). These signals fill in as the chat is used.
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatTile label="RAG queries" value={n(total)} sub="in this window" />
        <StatTile label="Cache hit rate" value={pct0(data.cache_hit_rate)} sub="answered with no LLM call" />
        <StatTile label="Avg groundedness" value={pct0(data.avg_groundedness)} sub="answer backed by context" />
        <StatTile label="Low confidence" value={pct0(data.low_confidence_rate)} sub="retriever was unsure" />
        <StatTile label="Web fallback" value={pct0(data.web_fallback_rate)} sub="answered from the web" />
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Panel title="Answer source" info="Where live answers came from — the knowledge base, the web, or a dataset. Bar length = share of all queries.">
          <BarList items={sources} />
        </Panel>
        <Panel title="Groundedness per day" info="Daily average of how well answers are supported by the retrieved context (higher = less made up). Watch for a downward drift.">
          <LineChart series={[{ name: "groundedness", color: PRIMARY, values: ground }]} xLabels={data.daily.map((d) => mmdd(d.date))} yFormat={(v) => pct0(v)} yMax={1} area height={150} />
        </Panel>
      </div>
    </div>
  );
}
