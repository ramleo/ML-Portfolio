"use client";

import { useState } from "react";
import { useMeasure } from "./useMeasure";
import { useTip, TipRow } from "./Tooltip";
import { C, niceMax } from "./format";

/** Stacked column chart drawn at real pixel size — a y-axis with a clean max, a
 * hairline baseline, first/last x labels, and a per-column hover tooltip. Segments
 * stack from the baseline with a 2px surface gap. Used for calls-per-day (ok/error). */

export interface Col { label: string; segs: { value: number; color: string; name: string }[] }

export default function ColumnChart({ cols, yFormat = (v) => String(Math.round(v)), height = 150 }:
  { cols: Col[]; yFormat?: (n: number) => string; height?: number }) {
  const [box, w] = useMeasure<HTMLDivElement>();
  const { move, leave, Tip } = useTip();
  const [hi, setHi] = useState<number | null>(null);

  const n = cols.length;
  const totals = cols.map((c) => c.segs.reduce((a, s) => a + s.value, 0));
  const top = niceMax(Math.max(1, ...totals));
  const h = height, padL = 46, padR = 14, padT = 10, padB = 22;
  const plotW = Math.max(1, w - padL - padR), plotH = h - padT - padB;
  const barW = plotW / Math.max(1, n);
  const gap = Math.min(4, barW * 0.3);
  const y = (v: number) => padT + (1 - v / top) * plotH;

  return (
    <div ref={box} style={{ width: "100%", height: h, position: "relative" }}
      onMouseLeave={() => { setHi(null); leave(); }}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="columns" style={{ display: "block" }}>
          {[0, 0.5, 1].map((t) => {
            const yy = y(top * t);
            return (
              <g key={t}>
                <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke={C.grid} strokeWidth={1} />
                <text x={padL - 8} y={yy} fontSize={11} fill={C.text3} textAnchor="end" dominantBaseline="middle" style={{ fontVariantNumeric: "tabular-nums" }}>{yFormat(top * t)}</text>
              </g>
            );
          })}

          {cols.map((c, i) => {
            const bx = padL + i * barW + gap / 2;
            const bw = Math.max(1, barW - gap);
            let acc = 0;
            const total = totals[i];
            return (
              <g key={i} opacity={hi == null || hi === i ? 1 : 0.45}
                onMouseMove={(e) => { setHi(i); move(e, (
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ color: "var(--text3)", fontSize: 11 }}>{c.label}</div>
                    {c.segs.map((s) => <TipRow key={s.name} color={s.color} label={s.name} value={yFormat(s.value)} />)}
                  </div>
                )); }}>
                {/* invisible full-height hit target so thin bars are easy to hover */}
                <rect x={bx} y={padT} width={bw} height={plotH} fill="transparent" />
                {c.segs.map((s, si) => {
                  if (s.value <= 0) return null;
                  const segH = (s.value / top) * plotH;
                  const yy = y(acc + s.value);
                  acc += s.value;
                  const isTop = si === c.segs.length - 1 || c.segs.slice(si + 1).every((x) => x.value <= 0);
                  return <rect key={si} className="ev-rise" x={bx} y={yy} width={bw} height={Math.max(0.5, segH - (si > 0 ? 2 : 0))} fill={s.color} rx={isTop ? Math.min(3, bw / 2) : 0} />;
                })}
                {total <= 0 && <rect x={bx} y={y(0) - 1} width={bw} height={1} fill={C.grid} />}
              </g>
            );
          })}

          <line x1={padL} y1={y(0)} x2={w - padR} y2={y(0)} stroke={C.axis} strokeWidth={1} />
          {(() => {
            // ~6 evenly spaced date ticks, centered under their column.
            const want = Math.min(6, n);
            const step = n <= 1 ? 1 : (n - 1) / (want - 1);
            const idx = [...new Set(Array.from({ length: want }, (_, k) => Math.round(k * step)))];
            return idx.map((i) => {
              const cx = padL + i * barW + barW / 2;
              const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
              return <text key={i} x={anchor === "start" ? padL : anchor === "end" ? w - padR : cx} y={h - 6} fontSize={11} fill={C.text3} textAnchor={anchor}>{cols[i]?.label}</text>;
            });
          })()}
        </svg>
      )}
      {Tip}
    </div>
  );
}
