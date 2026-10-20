"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import EvalCallDrawer, { type CallFilter } from "./EvalCallDrawer";
import EvalTrends from "./EvalTrends";
import EvalQuality from "./EvalQuality";
import EvalRagHealth from "./EvalRagHealth";
import EvalBudget from "./EvalBudget";
import Eval3DBoundary from "./Eval3DBoundary";

// three.js needs the browser — load the 3D explorer client-only.
const Eval3D = dynamic(() => import("./Eval3D"), {
  ssr: false,
  loading: () => <div style={{ background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "18px 20px", fontSize: 13, color: "var(--text2)" }}>Loading 3D…</div>,
});

/** Q4 M1 — owner LLM performance & cost dashboard over llm_calls (via /api/eval).
 * Content-free: counts, timings, tokens, cost — never prompt text. Breakdown bars
 * and error clusters drill down into the individual calls (feature A). */

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

const ACCENT = "var(--accent)";
const ERR = "#f87171"; // reserved for the error/failure state only

const n = (x: number) => x.toLocaleString();
const usd = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
const ms = (x: number | null) => (x == null ? "—" : x >= 1000 ? `${(x / 1000).toFixed(1)}s` : `${Math.round(x)}ms`);
const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

const card: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)", padding: "18px 20px",
};

/** Period-over-period chip. Neutral by design — a change here is informational,
 * not good/bad, so it never borrows the error red (dataviz: reserve status color).
 * `pp` shows a percentage-point difference (for rates); otherwise a % change. */
function DeltaChip({ cur, prev, pp = false }: { cur: number | null; prev: number | null | undefined; pp?: boolean }) {
  if (cur == null || prev == null) return null;
  const diff = pp ? (cur - prev) * 100 : (prev === 0 ? null : ((cur - prev) / prev) * 100);
  if (diff == null) return prev === 0 && cur > 0 ? <span style={{ color: "var(--text3)", fontSize: 12 }}>new</span> : null;
  if (Math.abs(diff) < 0.05) return <span style={{ color: "var(--text3)", fontSize: 12 }}>· flat</span>;
  const up = diff > 0;
  const mag = pp ? `${Math.abs(diff).toFixed(1)}pp` : `${Math.abs(diff).toFixed(0)}%`;
  return (
    <span style={{ color: "var(--text3)", fontSize: 12, fontVariantNumeric: "tabular-nums" }} title="vs the previous equal period">
      {up ? "↑" : "↓"}{mag}
    </span>
  );
}

function Tile({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: React.ReactNode }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, color: "var(--text)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "4px 0 0", display: "flex", gap: 6, alignItems: "baseline" }}>
        {sub && <span>{sub}</span>}
        {delta}
      </p>
    </div>
  );
}

function Breakdown({ title, items, filterKey, days, onPick }:
  { title: string; items: Bucket[]; filterKey: FilterKey; days: number; onPick: (f: CallFilter) => void }) {
  const max = Math.max(1, ...items.map((i) => i.calls));
  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: "0 0 14px", color: "var(--text)" }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No data.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 8).map((i) => (
            <button key={i.name} type="button"
              onClick={() => onPick({ key: filterKey, value: i.name, days, title: `${title}: ${i.name}` })}
              title={`${i.name}: ${n(i.calls)} calls, ${i.errors} errors, p95 ${ms(i.p95_ms)}, ${usd(i.cost_usd)} — click to drill in`}
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>{i.name}</span>
                <span style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>
                  {n(i.calls)}{i.errors > 0 && <span style={{ color: ERR }}> · {i.errors} err</span>}
                  {i.p95_ms != null && <span style={{ color: "var(--text3)" }}> · {ms(i.p95_ms)}</span>}
                </span>
              </div>
              <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${((i.calls - i.errors) / max) * 100}%`, background: ACCENT, borderRadius: "4px 0 0 4px" }} />
                {i.errors > 0 && <div style={{ width: `${(i.errors / max) * 100}%`, background: ERR, marginLeft: 2 }} />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopErrors({ clusters, days, onPick }:
  { clusters: Cluster[]; days: number; onPick: (f: CallFilter) => void }) {
  return (
    <div style={{ ...card, borderColor: clusters.length ? ERR : "var(--border2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>Top errors</h3>
        <button type="button" onClick={() => onPick({ onlyErrors: true, days, title: "All failures" })}
          style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", padding: "3px 10px", fontSize: 12 }}>
          View all failures
        </button>
      </div>
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
                <span style={{ color: ERR, fontSize: 12.5 }}> · {c.reason}</span>
                {c.sample && <div style={{ color: "var(--text3)", fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sample}</div>}
              </span>
              <span style={{ color: ERR, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{n(c.count)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyChart({ daily }: { daily: Day[] }) {
  const max = Math.max(1, ...daily.map((d) => d.calls));
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>Calls per day</h3>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>
          <span style={{ display: "inline-block", width: 9, height: 9, background: ACCENT, borderRadius: 2, marginRight: 4 }} />ok
          <span style={{ display: "inline-block", width: 9, height: 9, background: ERR, borderRadius: 2, margin: "0 4px 0 12px" }} />error
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
        {daily.map((d) => {
          const okH = (d.calls - d.errors) / max * 100;
          const errH = d.errors / max * 100;
          return (
            <div key={d.date} title={`${d.date}: ${n(d.calls)} calls, ${d.errors} errors, ${usd(d.cost_usd)}`}
              style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
              {errH > 0 && <div style={{ height: `${errH}%`, background: ERR, borderRadius: "2px 2px 0 0" }} />}
              <div style={{ height: `${okH}%`, background: ACCENT, borderRadius: errH > 0 ? 0 : "2px 2px 0 0", marginTop: errH > 0 ? 1 : 0 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text3)" }}>
        <span>{daily[0]?.date.slice(5)}</span>
        <span>{daily[daily.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/** A titled band of the dashboard — gives each group of panels room to breathe
 * and a clear heading, instead of one long stack of cards. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
        <h2 style={{ fontFamily: "var(--type-display)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: 0 }}>{title}</h2>
        {hint && <span style={{ fontSize: 12, color: "var(--text3)" }}>{hint}</span>}
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      {children}
    </section>
  );
}

export default function EvalDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<CallFilter | null>(null);
  const [show3d, setShow3d] = useState(false); // three.js is ~1.6 MB — load on demand only

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
  if (!data) return <p style={{ color: ERR, fontSize: 14 }}>Couldn&apos;t load metrics.</p>;

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {/* Range selector */}
      <div style={{ display: "flex", gap: 6 }}>
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
      </div>

      <Section title="Overview" hint={`last ${days} days · vs previous ${days}`}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Tile label="Calls" value={n(data.total)} sub={`${n(data.errors)} errors`}
            delta={<DeltaChip cur={data.total} prev={data.prev?.calls} />} />
          <Tile label="Success rate" value={pct(data.success_rate)}
            delta={<DeltaChip cur={data.success_rate} prev={data.prev?.success_rate} pp />} />
          <Tile label="p95 latency" value={ms(data.p95_ms)} sub={`p50 ${ms(data.p50_ms)} · p99 ${ms(data.p99_ms)}`}
            delta={<DeltaChip cur={data.p95_ms} prev={data.prev?.p95_ms} />} />
          <Tile label="Cost" value={usd(data.cost_usd)}
            delta={<DeltaChip cur={data.cost_usd} prev={data.prev?.cost_usd} />} />
          <Tile label="Tokens" value={n(data.tokens)} sub={`in ${n(data.tokens_in)} · out ${n(data.tokens_out)}`}
            delta={<DeltaChip cur={data.tokens} prev={data.prev?.tokens} />} />
        </div>
      </Section>

      <Section title="Volume & cost">
        <EvalBudget />
        <DailyChart daily={data.daily} />
        <EvalTrends daily={data.daily} />
      </Section>

      <Section title="3D call explorer" hint="latency × tokens × cost — rotate to find clusters & outliers">
        {show3d ? <Eval3DBoundary><Eval3D days={days} /></Eval3DBoundary> : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>An interactive 3D scatter of recent calls. It pulls in a ~1.6 MB 3D engine, so it loads only when you ask.</span>
            <button type="button" onClick={() => setShow3d(true)}
              style={{ padding: "0.4rem 1rem", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "var(--accent)", color: "#fff", whiteSpace: "nowrap" }}>
              Load 3D view
            </button>
          </div>
        )}
      </Section>

      <Section title="Breakdowns" hint="click a bar to drill into the calls">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Breakdown title="By provider" items={data.byProvider} filterKey="provider" days={days} onPick={setDrawer} />
          <Breakdown title="By model" items={data.byModel} filterKey="model" days={days} onPick={setDrawer} />
          <Breakdown title="By tool" items={data.byTool} filterKey="tool" days={days} onPick={setDrawer} />
          <Breakdown title="By status" items={data.byStatus} filterKey="status" days={days} onPick={setDrawer} />
        </div>
      </Section>

      <Section title="Answer quality" hint="golden set + LLM judge">
        <EvalQuality perf={data.byModel} />
      </Section>

      <Section title="Live RAG health" hint="per-query signals from the chat">
        <EvalRagHealth days={days} />
      </Section>

      <Section title="Errors">
        <TopErrors clusters={data.errorClusters ?? []} days={days} onPick={setDrawer} />
      </Section>

      {drawer && <EvalCallDrawer filter={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
