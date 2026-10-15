"use client";
import { useState } from "react";

/** SVG charts for the click-audit dashboard. All single-series (one accent hue,
 * gradient fill = the sequential ramp of that one hue), labels on text tokens.
 * No chart library — hand-authored SVG that themes via currentColor/tokens. */

export interface SeriesPoint { t: number; count: number }

/** Tiny trend-at-a-glance line+area, no axes — lives inside a KPI card. */
export function Sparkline({ points, width = 150, height = 40 }: { points: SeriesPoint[]; width?: number; height?: number }) {
  if (points.length === 0) return null;
  const max = points.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  const n = points.length;
  const x = (i: number) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (c: number) => height - 2 - (c / max) * (height - 4);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height }}>
      <defs>
        <linearGradient id="auditSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#auditSpark)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Share-of-total donut. Single hue (the accent) stepped light→dark by rank —
 * sequential, so no categorical palette to validate; the legend gives identity. */
export function Donut({ rows, total }: { rows: { label: string; count: number }[]; total: number }) {
  const R = 54, SW = 18, C = 2 * Math.PI * R, cx = 70, cy = 70, gap = 2;
  const shade = (i: number) => [1, 0.62, 0.4, 0.26, 0.16][i] ?? 0.12;
  let acc = 0;
  return (
    <div style={{ display: "flex", gap: "1.1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.7rem" }}>
      <svg viewBox="0 0 140 140" width={140} height={140} role="img" aria-label={`By country, ${total} clicks total`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={SW} />
        {rows.map((r, i) => {
          const frac = total ? r.count / total : 0;
          const dash = Math.max(0, frac * C - gap);
          const el = (
            <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke="var(--accent)" strokeOpacity={shade(i)}
              strokeWidth={SW} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc} transform={`rotate(-90 ${cx} ${cy})`} />
          );
          acc += frac * C;
          return el;
        })}
        <text x={cx} y={cy - 1} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text)">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="var(--text3)">clicks</text>
      </svg>
      <div style={{ display: "grid", gap: 7, flex: 1, minWidth: 130 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--accent)", opacity: shade(i), flexShrink: 0 }} />
            <span style={{ color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <span style={{ color: "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.count}</span>
            <span style={{ color: "var(--text3)", fontVariantNumeric: "tabular-nums", width: 42, textAlign: "right" }}>{total ? Math.round((r.count / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The main trend: single-series area+line with gridlines and a hover crosshair. */
export function AreaChart({ points, bucket }: { points: SeriesPoint[]; bucket: "hour" | "day" }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 240, padL = 40, padR = 14, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = points.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (c: number) => padT + plotH - (c / max) * plotH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");
  const area = n > 0 ? `${line} L${x(n - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z` : "";
  const fmt = (t: number) => new Date(t).toLocaleString([], bucket === "day"
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", hour: "numeric" });
  const step = Math.max(1, Math.ceil(n / 6));
  // 3 horizontal gridlines at 0 / mid / max.
  const ticks = [0, 0.5, 1].map((f) => ({ v: Math.round(max * f), yy: padT + plotH - f * plotH }));

  if (n === 0) return <p style={{ color: "var(--text3)", fontSize: 13, margin: "0.5rem 0 0" }}>No clicks in this window.</p>;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Clicks over time: ${points.reduce((s, p) => s + p.count, 0)} clicks`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / plotW) * (n - 1));
          setHover(Math.min(n - 1, Math.max(0, i)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="auditArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.yy} x2={W - padR} y2={t.yy} stroke="var(--border)" strokeWidth={1} strokeDasharray={i === 0 ? undefined : "2 4"} />
            <text x={padL - 8} y={t.yy + 3} textAnchor="end" fontSize={10} fill="var(--text3)">{t.v}</text>
          </g>
        ))}
        <path d={area} fill="url(#auditArea)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--text3)">{fmt(p.t)}</text>
        ))}
        {hover !== null && (
          <>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + plotH} stroke="var(--text3)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].count)} r={4.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2.5} />
          </>
        )}
      </svg>
      {hover !== null && (
        <div style={{
          position: "absolute", top: 4, left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)",
          background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 9px",
          fontSize: 12, color: "var(--text)", pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        }}>
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{points[hover].count}</strong>
          <span style={{ color: "var(--text3)" }}> · {fmt(points[hover].t)}</span>
        </div>
      )}
    </div>
  );
}
