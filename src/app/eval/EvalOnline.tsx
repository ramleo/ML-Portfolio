"use client";

import { useEffect, useState } from "react";
import { Panel, StatTile } from "./charts/Panel";
import LineChart from "./charts/LineChart";
import { C, PRIMARY, pct0, mmdd, n } from "./charts/format";

/** Online quality — a reference-free LLM judge scores a SAMPLE of REAL live answers
 * (not a canned test). faithful (backed by the retrieved context) + relevant (answers
 * the question) → pass. Content-free: the question/answer/context were judged in flight
 * and never stored, only the verdict. Fills in as the live chat is used. */

interface Day { date: string; pass_rate: number | null }
interface Online {
  needs_setup?: boolean; total: number;
  pass_rate: number | null; faithful_rate: number | null; relevant_rate: number | null;
  avg_groundedness: number | null; tail_count: number; random_count: number; daily: Day[];
}

export default function EvalOnline({ days }: { days: number }) {
  const [data, setData] = useState<Online | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setData(null); setFailed(false);
      try {
        const res = await fetch(`/api/eval/online?days=${days}`, { cache: "no-store" });
        if (!active) return;
        if (res.ok) setData(await res.json()); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [days]);

  if (failed) return <Panel title="Online quality"><p style={{ fontSize: 13, color: C.err, margin: 0 }}>Couldn&apos;t load online quality.</p></Panel>;
  if (!data) return <Panel title="Online quality"><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></Panel>;
  if (data.needs_setup) return <Panel title="Online quality"><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up — run <code>supabase/eval_online.sql</code>. Scoring starts once the Space redeploys and the live chat is used.</p></Panel>;
  if (!data.total) return <Panel title="Online quality"><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No live answers judged in this window yet — use the chat, then refresh. (A sample is judged, biased toward low-confidence answers.)</p></Panel>;

  const pass = data.daily.map((d) => d.pass_rate);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: 0, lineHeight: 1.55 }}>
        A reference-free judge grades a sample of real answers people received — <strong>faithful</strong> (backed by the retrieved context) and <strong>relevant</strong> (addresses the question). There is no &ldquo;correct&rdquo; online (no reference answer), and no question or answer text is stored.
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatTile label="Answers judged" value={n(data.total)} sub={`${n(data.tail_count)} tail · ${n(data.random_count)} random`} />
        <StatTile label="Pass rate" value={pct0(data.pass_rate)} sub="faithful AND relevant" />
        <StatTile label="Faithful" value={pct0(data.faithful_rate)} sub="no claims beyond context" />
        <StatTile label="Relevant" value={pct0(data.relevant_rate)} sub="addresses the question" />
      </div>
      <Panel title="Pass rate per day" info="Daily share of judged live answers that were both faithful and relevant. Watch for a downward drift after a model or prompt change.">
        <LineChart series={[{ name: "pass rate", color: PRIMARY, values: pass }]} xLabels={data.daily.map((d) => mmdd(d.date))} yFormat={(v) => pct0(v)} yMax={1} area height={150} />
      </Panel>
    </div>
  );
}
