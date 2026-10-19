"use client";

import { useEffect, useState } from "react";

/** Q4 M1 — owner LLM performance & cost dashboard over llm_calls (via /api/eval).
 * Content-free: counts, timings, tokens, cost — never prompt text. */

interface Bucket { name: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }
interface Day { date: string; calls: number; errors: number; cost_usd: number }
interface Data {
  needs_setup?: boolean;
  total: number; ok: number; errors: number; success_rate: number | null;
  cost_usd: number; tokens: number; p50_ms: number | null; p95_ms: number | null;
  daily: Day[]; byTool: Bucket[]; byProvider: Bucket[]; byModel: Bucket[]; byStatus: Bucket[];
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

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, color: "var(--text)", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: Bucket[] }) {
  const max = Math.max(1, ...items.map((i) => i.calls));
  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: "0 0 14px", color: "var(--text)" }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No data.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 8).map((i) => (
            <div key={i.name} title={`${i.name}: ${n(i.calls)} calls, ${i.errors} errors, p95 ${ms(i.p95_ms)}, ${usd(i.cost_usd)}`}>
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
            </div>
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

export default function EvalDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div style={{ display: "grid", gap: 16 }}>
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

      {/* Headline tiles */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Tile label="Calls" value={n(data.total)} sub={`${n(data.errors)} errors`} />
        <Tile label="Success rate" value={pct(data.success_rate)} />
        <Tile label="p95 latency" value={ms(data.p95_ms)} sub={`p50 ${ms(data.p50_ms)}`} />
        <Tile label="Cost" value={usd(data.cost_usd)} />
        <Tile label="Tokens" value={n(data.tokens)} />
      </div>

      <DailyChart daily={data.daily} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Breakdown title="By provider" items={data.byProvider} />
        <Breakdown title="By model" items={data.byModel} />
        <Breakdown title="By tool" items={data.byTool} />
        <Breakdown title="By status" items={data.byStatus} />
      </div>
    </div>
  );
}
