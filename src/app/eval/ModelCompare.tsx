"use client";

import { useState } from "react";

/** Q4 — compare generation models on the golden set, three ways:
 *  - Lines: pass rate per model across its runs (trend / regression).
 *  - Bars:  per-criterion (correct/faithful/relevant/pass), grouped by metric.
 *  - Radar: each model's four quality metrics at a glance.
 * All lightweight inline SVG. Fed the runs the Quality section already loaded. */

interface Run {
  id: string; ts: string; gen_model: string | null; status: string;
  pass_rate: number | null; avg_correct: number | null; avg_faithful: number | null; avg_relevant: number | null;
}
/** Per-model perf/cost from /api/eval (llm_calls), passed down for the scatter. */
export interface ModelPerf { name: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }

const COLORS: Record<string, string> = {
  "command-a-03-2025": "#6366f1", "gemini-3.6-flash": "#0ea5e9", "mistral-small-latest": "#f59e0b",
};
const PALETTE = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#a855f7"];
const METRICS: { key: keyof Run; label: string }[] = [
  { key: "pass_rate", label: "Pass" }, { key: "avg_correct", label: "Correct" },
  { key: "avg_faithful", label: "Faithful" }, { key: "avg_relevant", label: "Relevant" },
];
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

type View = "lines" | "bars" | "radar" | "scatter";

export default function ModelCompare({ runs, perf = [] }: { runs: Run[]; perf?: ModelPerf[] }) {
  const [view, setView] = useState<View>("bars");

  const done = runs.filter((r) => r.status === "done" && r.gen_model && r.pass_rate != null);
  const models = [...new Set(done.map((r) => r.gen_model as string))];
  const colorOf = (m: string, i: number) => COLORS[m] ?? PALETTE[i % PALETTE.length];
  // Newest done run per model (for bars + radar).
  const latest = new Map<string, Run>();
  for (const r of done) if (!latest.has(r.gen_model as string)) latest.set(r.gen_model as string, r);

  if (models.length === 0)
    return <div style={card}><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Run the eval on a model to compare.</p></div>;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>Model comparison</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {(["bars", "lines", "radar", "scatter"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              style={{ padding: "0.25rem 0.7rem", fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: view === v ? "var(--accent)" : "transparent", color: view === v ? "#fff" : "var(--text2)" }}>
              {v === "scatter" ? "quality vs speed" : v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14, fontSize: 12, color: "var(--text2)" }}>
        {models.map((m, i) => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(m, i), display: "inline-block" }} />{m}
          </span>
        ))}
      </div>

      {view === "bars" && <Bars models={models} latest={latest} colorOf={colorOf} />}
      {view === "radar" && <Radar models={models} latest={latest} colorOf={colorOf} />}
      {view === "lines" && <Lines done={done} models={models} colorOf={colorOf} />}
      {view === "scatter" && <Scatter models={models} latest={latest} perf={perf} colorOf={colorOf} />}
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px" };

function Bars({ models, latest, colorOf }: { models: string[]; latest: Map<string, Run>; colorOf: (m: string, i: number) => string }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {METRICS.map((metric) => (
        <div key={metric.key as string}>
          <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 7px" }}>{metric.label}</p>
          <div style={{ display: "grid", gap: 6 }}>
            {models.map((m, i) => {
              const v = (latest.get(m)?.[metric.key] as number | null) ?? null;
              return (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <span style={{ width: 150, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m}</span>
                  <span style={{ flex: 1, height: 9, background: "var(--bg-card)", borderRadius: 4, overflow: "hidden" }}>
                    <span style={{ display: "block", width: `${Math.round((v ?? 0) * 100)}%`, height: "100%", background: colorOf(m, i) }} />
                  </span>
                  <span style={{ width: 40, textAlign: "right", color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{pct(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Radar({ models, latest, colorOf }: { models: string[]; latest: Map<string, Run>; colorOf: (m: string, i: number) => string }) {
  const W = 360, cx = W / 2, cy = 150, R = 110, N = METRICS.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r * R, cy + Math.sin(ang(i)) * r * R];
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${W} 300`} width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Model comparison radar">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={METRICS.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="var(--border2)" strokeWidth={1} />
        ))}
        {METRICS.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border2)" strokeWidth={1} />; })}
        {METRICS.map((metric, i) => {
          const [x, y] = pt(i, 1.18);
          return <text key={metric.key as string} x={x} y={y} fontSize={11} fill="var(--text3)" textAnchor="middle" dominantBaseline="middle">{metric.label}</text>;
        })}
        {models.map((m, mi) => {
          const run = latest.get(m);
          const pts = METRICS.map((metric, i) => pt(i, ((run?.[metric.key] as number | null) ?? 0))).map((p) => p.join(",")).join(" ");
          const c = colorOf(m, mi);
          return <polygon key={m} points={pts} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={2} />;
        })}
      </svg>
    </div>
  );
}

function Lines({ done, models, colorOf }: { done: Run[]; models: string[]; colorOf: (m: string, i: number) => string }) {
  const W = 520, H = 150, pad = 12;
  // Oldest→newest per model.
  const series = models.map((m) => done.filter((r) => r.gen_model === m).slice().reverse());
  const maxLen = Math.max(...series.map((s) => s.length), 1);
  const x = (i: number) => pad + (maxLen <= 1 ? (W - 2 * pad) / 2 : (i / (maxLen - 1)) * (W - 2 * pad));
  const y = (v: number) => pad + (1 - v) * (H - 2 * pad);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Pass rate per model over runs" preserveAspectRatio="none">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border2)" strokeWidth={1} />
        {series.map((s, mi) => {
          const c = colorOf(models[mi], mi);
          const pts = s.map((r, i) => `${x(i).toFixed(1)},${y(r.pass_rate ?? 0).toFixed(1)}`).join(" ");
          return (
            <g key={models[mi]}>
              {s.length > 1 && <polyline points={pts} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {s.map((r, i) => <circle key={r.id} cx={x(i)} cy={y(r.pass_rate ?? 0)} r={3} fill={c}><title>{`${models[mi]} · run ${i + 1}: ${pct(r.pass_rate)}`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      {maxLen < 2 && <p style={{ fontSize: 12, color: "var(--text3)", margin: "6px 0 0" }}>One run per model so far — run a model again to draw its trend line.</p>}
    </>
  );
}

function Scatter({ models, latest, perf, colorOf }: { models: string[]; latest: Map<string, Run>; perf: ModelPerf[]; colorOf: (m: string, i: number) => string }) {
  const pts = models.map((m, i) => {
    const b = perf.find((x) => x.name === m);
    return { m, color: colorOf(m, i), lat: b?.p95_ms ?? null, cost: b && b.calls ? b.cost_usd / b.calls : null, q: latest.get(m)?.pass_rate ?? null };
  }).filter((p): p is { m: string; color: string; lat: number; cost: number | null; q: number } => p.lat != null && p.q != null);

  if (pts.length === 0)
    return <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No per-model latency yet — needs calls in <code>llm_calls</code> for these models.</p>;

  const W = 520, H = 250, padL = 46, padR = 16, padB = 36, padT = 14;
  const maxLat = Math.max(...pts.map((p) => p.lat)) * 1.12 || 1;
  const x = (lat: number) => padL + (lat / maxLat) * (W - padL - padR);
  const y = (q: number) => padT + (1 - q) * (H - padT - padB);
  const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Quality vs speed by model">
        {/* y gridlines + labels (pass rate) */}
        {[0, 0.25, 0.5, 0.75, 1].map((q) => (
          <g key={q}>
            <line x1={padL} y1={y(q)} x2={W - padR} y2={y(q)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={y(q)} fontSize={10} fill="var(--text3)" textAnchor="end" dominantBaseline="middle">{Math.round(q * 100)}%</text>
          </g>
        ))}
        {/* x labels (latency) */}
        {[0, maxLat / 2, maxLat].map((lat, i) => (
          <text key={i} x={x(lat)} y={H - padB + 16} fontSize={10} fill="var(--text3)" textAnchor="middle">{ms(lat)}</text>
        ))}
        <text x={(padL + W - padR) / 2} y={H - 2} fontSize={10.5} fill="var(--text3)" textAnchor="middle">p95 latency → (faster is left)</text>
        {pts.map((p) => (
          <g key={p.m}>
            <circle cx={x(p.lat)} cy={y(p.q)} r={6} fill={p.color} stroke="var(--bg)" strokeWidth={1.5}>
              <title>{`${p.m}: ${Math.round(p.q * 100)}% pass · p95 ${ms(p.lat)}${p.cost != null ? ` · $${p.cost.toFixed(4)}/call` : ""}`}</title>
            </circle>
            <text x={x(p.lat)} y={y(p.q) - 10} fontSize={10.5} fill="var(--text2)" textAnchor="middle">{p.m.replace(/-latest$|-03-2025$/, "")}</text>
          </g>
        ))}
      </svg>
      <p style={{ fontSize: 12, color: "var(--text3)", margin: "6px 0 0" }}>Top-left is best: high pass rate, low latency. Hover a point for cost/call.</p>
    </>
  );
}
