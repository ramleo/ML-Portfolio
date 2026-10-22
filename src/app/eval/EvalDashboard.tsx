"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import EvalCallDrawer, { type CallFilter } from "./EvalCallDrawer";
import EvalTrends from "./EvalTrends";
import EvalQuality from "./EvalQuality";
import EvalRagHealth from "./EvalRagHealth";
import EvalOnline from "./EvalOnline";
import EvalBudget from "./EvalBudget";
import EvalFeedback from "./EvalFeedback";
import EvalGuide from "./EvalGuide";
import Eval3DBoundary from "./Eval3DBoundary";
import { Section, StatTile, DeltaChip, Panel, Legend } from "./charts/Panel";
import { BarList, type BarDatum } from "./charts/Bars";
import ColumnChart from "./charts/ColumnChart";
import { C, PRIMARY, EVAL_TOKENS_CSS, n, usd, ms, pct, mmdd } from "./charts/format";

// three.js needs the browser — load the 3D explorer client-only.
const Eval3D = dynamic(() => import("./Eval3D"), {
  ssr: false,
  loading: () => <Panel title="3D call explorer"><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading 3D…</p></Panel>,
});

/** Q4 — owner LLM performance, cost & quality dashboard over llm_calls (via /api/eval).
 * Content-free: counts, timings, tokens, cost, categorical signals and judge scores —
 * never prompt or answer text. Every chart is built from the shared, palette-validated
 * primitives in ./charts so the whole section reads as one system. */

interface Bucket { name: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }
interface Day { date: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }
interface Cluster { provider: string; reason: string; count: number; lastTs: string | null; sample: string }
interface Prev { calls: number; success_rate: number | null; cost_usd: number; tokens: number; p95_ms: number | null }
type FilterKey = "tool" | "provider" | "model" | "status";
interface Data {
  needs_setup?: boolean;
  total: number; ok: number; errors: number; success_rate: number | null;
  cost_usd: number; tokens: number; tokens_in: number; tokens_out: number;
  p50_ms: number | null; p95_ms: number | null; p99_ms: number | null;
  daily: Day[]; byTool: Bucket[]; byProvider: Bucket[]; byModel: Bucket[]; byStatus: Bucket[];
  errorClusters: Cluster[]; prev?: Prev;
}

/** One breakdown card — click a bar to drill into the calls behind it. */
function Breakdown({ title, info, items, filterKey, days, onPick }:
  { title: string; info: string; items: Bucket[]; filterKey: FilterKey; days: number; onPick: (f: CallFilter) => void }) {
  const max = Math.max(1, ...items.map((i) => i.calls));
  const data: BarDatum[] = items.slice(0, 8).map((i) => ({
    key: i.name, label: i.name, max,
    segs: [{ value: i.calls - i.errors, color: PRIMARY }, { value: i.errors, color: C.err }],
    value: <>{n(i.calls)}{i.errors > 0 && <span style={{ color: C.err }}> · {i.errors}</span>}</>,
    onClick: () => onPick({ key: filterKey, value: i.name, days, title: `${title}: ${i.name}` }),
    tip: (
      <div style={{ display: "grid", gap: 3 }}>
        <strong style={{ color: "var(--text)" }}>{i.name}</strong>
        <span>{n(i.calls)} calls{i.errors > 0 && <span style={{ color: C.err }}> · {i.errors} errors</span>}</span>
        <span>p95 {ms(i.p95_ms)} · {usd(i.cost_usd)}</span>
        <span style={{ color: "var(--text3)" }}>click to drill into these calls →</span>
      </div>
    ),
  }));
  return (
    <Panel title={title} info={info}>
      <BarList items={data} />
    </Panel>
  );
}

function TopErrors({ clusters, days, onPick }:
  { clusters: Cluster[]; days: number; onPick: (f: CallFilter) => void }) {
  return (
    <Panel title="Failures" info="Errors grouped by provider + reason, worst first. Click to see the individual failing calls." danger={clusters.length > 0}
      right={<button type="button" onClick={() => onPick({ onlyErrors: true, days, title: "All failures" })}
        style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", padding: "3px 10px", fontSize: 12 }}>View all failures</button>}>
      {clusters.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No failures in this window.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {clusters.map((c) => (
            <button key={`${c.provider}|${c.reason}`} type="button"
              onClick={() => onPick({ key: "provider", value: c.provider, onlyErrors: true, days, title: `Errors: ${c.provider} · ${c.reason}` })}
              title={c.sample || `${c.provider} ${c.reason}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", cursor: "pointer" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ color: "var(--text)", fontSize: 12.5, fontWeight: 600 }}>{c.provider}</span>
                <span style={{ color: C.err, fontSize: 12.5 }}> · {c.reason}</span>
                {c.sample && <div style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sample}</div>}
              </span>
              <span style={{ color: C.err, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{n(c.count)}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function EvalDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<CallFilter | null>(null);
  const [show3d, setShow3d] = useState(false); // three.js is ~1.1 MB — load on demand only
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/eval?days=${days}`, { cache: "no-store" });
        const d = res.ok ? await res.json() : null;
        if (active) setData(d);
      } catch {
        if (active) setData(null);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [days]);

  if (loading && !data) return <p style={{ color: "var(--text2)", fontSize: 14 }}>Loading…</p>;
  if (data?.needs_setup) return <p style={{ color: "var(--text2)", fontSize: 14 }}>No LLM-call data yet (the <code>llm_calls</code> table is empty or not set up).</p>;
  if (!data) return <p style={{ color: C.err, fontSize: 14 }}>Couldn&apos;t load metrics.</p>;

  const cols = data.daily.map((d) => ({
    label: mmdd(d.date),
    segs: [
      { value: d.calls - d.errors, color: PRIMARY, name: "ok" },
      { value: d.errors, color: C.err, name: "error" },
    ],
  }));

  return (
    <div className="eval-root" style={{ display: "grid", gap: 28 }}>
      <style>{EVAL_TOKENS_CSS}</style>

      {/* Range selector + guide */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            style={{
              padding: "0.35rem 0.8rem", fontSize: 13, fontWeight: 600, cursor: "pointer",
              borderRadius: 9999, border: "1px solid var(--border2)",
              background: days === d ? "var(--accent)" : "transparent",
              color: days === d ? "#fff" : "var(--text2)",
            }}>
            {d}d
          </button>
        ))}
        <button onClick={() => setGuide(true)} title="How to read this dashboard"
          style={{ marginLeft: "auto", padding: "0.35rem 0.9rem", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)" }}>
          Guide
        </button>
      </div>
      {guide && <EvalGuide onClose={() => setGuide(false)} />}

      <Section title="Overview" hint={`last ${days} days · change vs the previous ${days}`}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))" }}>
          <StatTile label="Calls" value={n(data.total)} sub={`${n(data.errors)} errors`}
            delta={<DeltaChip cur={data.total} prev={data.prev?.calls} />} />
          <StatTile label="Success rate" value={pct(data.success_rate)}
            delta={<DeltaChip cur={data.success_rate} prev={data.prev?.success_rate} pp />} />
          <StatTile label="p95 latency" value={ms(data.p95_ms)} sub={`p50 ${ms(data.p50_ms)} · p99 ${ms(data.p99_ms)}`}
            delta={<DeltaChip cur={data.p95_ms} prev={data.prev?.p95_ms} />} />
          <StatTile label="Cost" value={usd(data.cost_usd)} sub="estimated"
            delta={<DeltaChip cur={data.cost_usd} prev={data.prev?.cost_usd} />} />
          <StatTile label="Tokens" value={n(data.tokens)} sub={`in ${n(data.tokens_in)} · out ${n(data.tokens_out)}`}
            delta={<DeltaChip cur={data.tokens} prev={data.prev?.tokens} />} />
        </div>
      </Section>

      <Section title="Volume & cost" hint="how busy the site's LLM usage has been, and what it cost">
        <EvalBudget />
        <Panel title="Calls per day" info="Daily LLM calls over the window, split into successful (blue) and failed (red) — spot error spikes and volume changes."
          right={<Legend items={[{ label: "ok", color: PRIMARY }, { label: "error", color: C.err }]} />}>
          <ColumnChart cols={cols} height={150} />
        </Panel>
        <EvalTrends daily={data.daily} />
      </Section>

      <Section title="3D call explorer" hint="latency × tokens × cost — rotate to find clusters & outliers">
        {show3d ? <Eval3DBoundary><Eval3D days={days} /></Eval3DBoundary> : (
          <Panel title="3D call explorer" info="An interactive 3D scatter — one dot per call — for spotting clusters and outliers across three measures at once.">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>Loads a ~1.1 MB 3D engine, so it opens only when you ask.</span>
              <button type="button" onClick={() => setShow3d(true)}
                style={{ padding: "0.4rem 1rem", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "var(--accent)", color: "#fff", whiteSpace: "nowrap" }}>
                Load 3D view
              </button>
            </div>
          </Panel>
        )}
      </Section>

      <Section title="Breakdowns" hint="click any bar to drill into the individual calls">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
          <Breakdown title="By provider" info="Calls routed to each LLM provider. Bar length = call volume; the red tail = failures." items={data.byProvider} filterKey="provider" days={days} onPick={setDrawer} />
          <Breakdown title="By model" info="Calls per specific model. Compare volume, error share and (on hover) latency and cost." items={data.byModel} filterKey="model" days={days} onPick={setDrawer} />
          <Breakdown title="By tool" info="Which site feature made the call (chat, eval judge, public API…). Older rows logged before tool-tagging show 'unknown'." items={data.byTool} filterKey="tool" days={days} onPick={setDrawer} />
          <Breakdown title="By status" info="Successful vs failed calls overall." items={data.byStatus} filterKey="status" days={days} onPick={setDrawer} />
        </div>
      </Section>

      <Section title="Answer quality" hint="golden set + LLM judge">
        <EvalQuality perf={data.byModel} />
        <EvalFeedback days={days} />
      </Section>

      <Section title="Live RAG health" hint="per-query signals from the real chat">
        <EvalRagHealth days={days} />
      </Section>

      <Section title="Online quality" hint="LLM judge on a sample of real answers (faithful + relevant)">
        <EvalOnline days={days} />
      </Section>

      <Section title="Errors">
        <TopErrors clusters={data.errorClusters ?? []} days={days} onPick={setDrawer} />
      </Section>

      {drawer && <EvalCallDrawer filter={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
