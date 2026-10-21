"use client";

import { useMeasure } from "./charts/useMeasure";
import { useTip, TipRow } from "./charts/Tooltip";
import { C, pct0, ms } from "./charts/format";

/** The two non-bar model-comparison views — kept here so ModelCompare stays small.
 * Radar = all four quality metrics per model; Scatter = quality vs speed. Both use
 * the shared validated palette, direct labels and hover tooltips. */

export interface Run {
  id: string; ts: string; gen_model: string | null; status: string;
  pass_rate: number | null; avg_correct: number | null; avg_faithful: number | null; avg_relevant: number | null;
}
export interface ModelPerf { name: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }
export const METRICS: { key: keyof Run; label: string }[] = [
  { key: "pass_rate", label: "Pass" }, { key: "avg_correct", label: "Correct" },
  { key: "avg_faithful", label: "Faithful" }, { key: "avg_relevant", label: "Relevant" },
];

export function Radar({ models, latest, colorOf }:
  { models: string[]; latest: Map<string, Run>; colorOf: (m: string) => string }) {
  const W = 360, cx = W / 2, cy = 158, R = 108, N = METRICS.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(ang(i)) * r * R, cy + Math.sin(ang(i)) * r * R];
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${W} 320`} width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Model comparison radar">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={METRICS.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke={C.grid} strokeWidth={1} />
        ))}
        {METRICS.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.grid} strokeWidth={1} />; })}
        <text x={pt(0, 1.16)[0]} y={pt(0, 1.16)[1]} fontSize={11} fill={C.text3} textAnchor="middle">Pass 100%</text>
        {METRICS.map((metric, i) => i > 0 && (() => { const [x, y] = pt(i, 1.17); return <text key={metric.key as string} x={x} y={y} fontSize={11} fill={C.text3} textAnchor="middle" dominantBaseline="middle">{metric.label}</text>; })())}
        {models.map((m) => {
          const run = latest.get(m);
          const pts = METRICS.map((metric, i) => pt(i, ((run?.[metric.key] as number | null) ?? 0))).map((p) => p.join(",")).join(" ");
          const c = colorOf(m);
          return <polygon key={m} points={pts} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={2} />;
        })}
      </svg>
    </div>
  );
}

export function Scatter({ models, latest, perf, colorOf }:
  { models: string[]; latest: Map<string, Run>; perf: ModelPerf[]; colorOf: (m: string) => string }) {
  const [box, w] = useMeasure<HTMLDivElement>();
  const { move, leave, Tip } = useTip();
  const pts = models.map((m) => {
    const b = perf.find((x) => x.name === m);
    return { m, color: colorOf(m), lat: b?.p95_ms ?? null, cost: b && b.calls ? b.cost_usd / b.calls : null, q: latest.get(m)?.pass_rate ?? null };
  }).filter((p): p is { m: string; color: string; lat: number; cost: number | null; q: number } => p.lat != null && p.q != null);

  if (pts.length === 0)
    return <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No per-model latency yet — needs calls in <code>llm_calls</code> for these models.</p>;

  const h = 300, padL = 44, padR = 20, padB = 40, padT = 14;
  const plotW = Math.max(1, w - padL - padR), plotH = h - padT - padB;
  const maxLat = Math.max(...pts.map((p) => p.lat)) * 1.15 || 1;
  const x = (lat: number) => padL + (lat / maxLat) * plotW;
  const y = (q: number) => padT + (1 - q) * plotH;

  return (
    <div ref={box} style={{ width: "100%", height: h, position: "relative" }}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="Quality vs speed by model" style={{ display: "block" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((q) => (
            <g key={q}>
              <line x1={padL} y1={y(q)} x2={w - padR} y2={y(q)} stroke={C.grid} strokeWidth={1} />
              <text x={padL - 8} y={y(q)} fontSize={11} fill={C.text3} textAnchor="end" dominantBaseline="middle">{Math.round(q * 100)}%</text>
            </g>
          ))}
          {[0, maxLat / 2, maxLat].map((lat, i) => (
            <text key={i} x={x(lat)} y={h - padB + 15} fontSize={11} fill={C.text3} textAnchor="middle">{ms(lat)}</text>
          ))}
          <text x={padL - 34} y={padT + 2} fontSize={10.5} fill={C.text3} transform={`rotate(-90 ${padL - 34} ${padT + 2})`} textAnchor="end">pass rate ↑</text>
          <text x={(padL + w - padR) / 2} y={h - 6} fontSize={11} fill={C.text3} textAnchor="middle">p95 latency → (faster is left)</text>
          {pts.map((p) => (
            <g key={p.m}
              onMouseMove={(e) => move(e, (
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ color: "var(--text)" }}>{p.m}</strong>
                  <TipRow color={p.color} label="pass rate" value={pct0(p.q)} />
                  <TipRow label="p95 latency" value={ms(p.lat)} />
                  {p.cost != null && <TipRow label="cost / call" value={`$${p.cost.toFixed(4)}`} />}
                </div>
              ))} onMouseLeave={leave}>
              <circle cx={x(p.lat)} cy={y(p.q)} r={16} fill="transparent" />
              <circle cx={x(p.lat)} cy={y(p.q)} r={7} fill={p.color} stroke="var(--bg-card)" strokeWidth={1.5} />
              <text x={x(p.lat)} y={y(p.q) - 13} fontSize={12} fontWeight={600} fill={C.text2} textAnchor="middle">{p.m.replace(/-latest$|-03-2025$/, "")}</text>
            </g>
          ))}
        </svg>
      )}
      {Tip}
    </div>
  );
}
