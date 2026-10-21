"use client";

import { useState } from "react";
import { useMeasure } from "./useMeasure";
import { useTip, TipRow } from "./Tooltip";
import { C, niceMax } from "./format";

/** Line / area chart drawn at real pixel size (via useMeasure) so text is literal
 * and marks undistorted — no preserveAspectRatio stretch. One linear y-scale, a
 * hairline grid, first/last x labels, a hover crosshair and a tooltip listing every
 * series at that point. Single series gets a soft area fill. Nulls break the line. */

export interface LineSeries { name: string; color: string; values: (number | null)[] }

export default function LineChart({ series, xLabels, yFormat, yMax, height = 150, area, xTitle }:
  { series: LineSeries[]; xLabels: string[]; yFormat: (n: number) => string; yMax?: number; height?: number; area?: boolean; xTitle?: string }) {
  const [box, w] = useMeasure<HTMLDivElement>();
  const { move, leave, Tip } = useTip();
  const [hi, setHi] = useState<number | null>(null);

  const nx = xLabels.length;
  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const top = yMax ?? niceMax(allVals.length ? Math.max(...allVals) : 1);
  const h = height;
  const padL = 46, padR = 14, padT = 10, padB = 22;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = h - padT - padB;
  const x = (i: number) => padL + (nx <= 1 ? plotW / 2 : (i / (nx - 1)) * plotW);
  const y = (v: number) => padT + (1 - v / top) * plotH;

  // Contiguous runs of non-null points, so a gap day breaks the line instead of
  // drawing a false straight segment across it.
  const runsOf = (vals: (number | null)[]) => {
    const runs: number[][] = []; let cur: number[] = [];
    vals.forEach((v, i) => { if (v != null) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } });
    if (cur.length) runs.push(cur);
    return runs;
  };
  const single = series.length === 1;

  return (
    <div ref={box} style={{ width: "100%", height: h, position: "relative" }}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="trend" style={{ display: "block" }}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const i = Math.max(0, Math.min(nx - 1, Math.round(((e.clientX - rect.left - padL) / plotW) * (nx - 1))));
            setHi(i);
            move(e, (
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ color: "var(--text3)", fontSize: 11 }}>{xLabels[i]}</div>
                {series.map((s) => <TipRow key={s.name} color={single ? undefined : s.color} label={s.name} value={s.values[i] == null ? "—" : yFormat(s.values[i] as number)} />)}
              </div>
            ));
          }}
          onMouseLeave={() => { setHi(null); leave(); }}>
          <defs>
            <linearGradient id="evArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color ?? C.s1} stopOpacity={0.22} />
              <stop offset="100%" stopColor={series[0]?.color ?? C.s1} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* y grid + ticks */}
          {[0, 0.5, 1].map((t) => {
            const v = top * t, yy = y(v);
            return (
              <g key={t}>
                <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke={C.grid} strokeWidth={1} />
                <text x={padL - 8} y={yy} fontSize={11} fill={C.text3} textAnchor="end" dominantBaseline="middle" style={{ fontVariantNumeric: "tabular-nums" }}>{yFormat(v)}</text>
              </g>
            );
          })}

          {series.map((s) => runsOf(s.values).map((run, ri) => {
            const pts = run.map((i) => `${x(i).toFixed(1)},${y(s.values[i] as number).toFixed(1)}`).join(" ");
            const areaPts = single && area && run.length > 1
              ? `${x(run[0])},${y(0)} ${pts} ${x(run[run.length - 1])},${y(0)}` : null;
            return (
              <g key={`${s.name}-${ri}`}>
                {areaPts && <polygon points={areaPts} fill="url(#evArea)" />}
                {run.length > 1
                  ? <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  : <circle cx={x(run[0])} cy={y(s.values[run[0]] as number)} r={3} fill={s.color} />}
              </g>
            );
          }))}

          {/* crosshair + highlighted points */}
          {hi != null && (
            <>
              <line x1={x(hi)} y1={padT} x2={x(hi)} y2={h - padB} stroke={C.axis} strokeWidth={1} />
              {series.map((s) => s.values[hi] != null && (
                <circle key={s.name} cx={x(hi)} cy={y(s.values[hi] as number)} r={4} fill={s.color} stroke="var(--bg-card)" strokeWidth={1.5} />
              ))}
            </>
          )}

          {/* x labels: ~5 evenly spaced ticks */}
          {!xTitle && (() => {
            const want = Math.min(5, nx);
            const step = nx <= 1 ? 1 : (nx - 1) / (want - 1);
            const idx = [...new Set(Array.from({ length: want }, (_, k) => Math.round(k * step)))];
            return idx.map((i) => {
              const anchor = i === 0 ? "start" : i === nx - 1 ? "end" : "middle";
              return <text key={i} x={i === 0 ? padL : i === nx - 1 ? w - padR : x(i)} y={h - 6} fontSize={11} fill={C.text3} textAnchor={anchor}>{xLabels[i]}</text>;
            });
          })()}
          {xTitle && <text x={(padL + w - padR) / 2} y={h - 6} fontSize={11} fill={C.text3} textAnchor="middle">{xTitle}</text>}
        </svg>
      )}
      {Tip}
    </div>
  );
}
