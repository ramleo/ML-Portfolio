"use client";

import { useState, useEffect } from "react";
import { SERIES_COLORS } from "./SqlChart";

const TX = "#71717a";

function fmt(v: number): string {
  if (!isFinite(v)) return "0";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `${s}${(a / 1_000).toFixed(1)}k`;
  return String(Number.isInteger(v) ? v : parseFloat(v.toFixed(2)));
}

// ── AnimatedStatCard ───────────────────────────────────────────────────────────
export function AnimatedStatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
  const n = Number(String(value).replace(/,/g, ""));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isFinite(n)) return;
    const start = performance.now();
    const duration = 1100;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(n * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [n]);

  const formatted = isFinite(n) ? display.toLocaleString() : value;
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <p className="text-xs uppercase tracking-widest font-medium" style={{ color: accent }}>{label}</p>
      <p className="text-6xl font-bold tabular-nums leading-none transition-all" style={{ color: "white" }}>
        {formatted}
      </p>
    </div>
  );
}

// ── HeatmapChart ───────────────────────────────────────────────────────────────
interface HeatmapProps {
  rows: string[]; cols: string[];
  data: { row: string; col: string; value: number }[];
  xLabel: string; yLabel: string; vLabel: string;
}

export function HeatmapChart({ rows, cols, data, xLabel, yLabel, vLabel }: HeatmapProps) {
  const CELL_W = Math.min(64, Math.max(24, 440 / Math.max(cols.length, 1)));
  const CELL_H = Math.min(36, Math.max(22, 280 / Math.max(rows.length, 1)));
  const PL = 110, PT = 56, PR = 12, PB = 24;
  const W   = PL + CELL_W * cols.length + PR;
  const H   = PT + CELL_H * rows.length + PB;

  const vals = data.map(d => d.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals, 1);
  const lookup = new Map(data.map(d => [`${d.row}|${d.col}`, d.value]));

  function cellColor(v: number) {
    const t = maxV === minV ? 0.5 : (v - minV) / (maxV - minV);
    return `rgba(99,102,241,${(0.08 + t * 0.85).toFixed(2)})`;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W, maxHeight: H }}>
        {cols.map((col, ci) => (
          <text key={ci}
            x={PL + ci * CELL_W + CELL_W / 2} y={PT - 6}
            fontSize={9} fill={TX} textAnchor="end"
            transform={`rotate(-40,${PL + ci * CELL_W + CELL_W / 2},${PT - 6})`}>
            {String(col).slice(0, 14)}
          </text>
        ))}
        {rows.map((row, ri) => (
          <text key={ri}
            x={PL - 6} y={PT + ri * CELL_H + CELL_H / 2 + 4}
            fontSize={9} fill={TX} textAnchor="end">
            {String(row).slice(0, 18)}
          </text>
        ))}
        {rows.map((row, ri) =>
          cols.map((col, ci) => {
            const v = lookup.get(`${row}|${col}`);
            if (v === undefined) return (
              <rect key={`${ri}-${ci}`}
                x={PL + ci * CELL_W} y={PT + ri * CELL_H}
                width={CELL_W - 2} height={CELL_H - 2}
                fill="rgba(255,255,255,0.02)" rx={2} />
            );
            return (
              <g key={`${ri}-${ci}`}>
                <rect x={PL + ci * CELL_W} y={PT + ri * CELL_H}
                  width={CELL_W - 2} height={CELL_H - 2}
                  fill={cellColor(v)} rx={2} stroke="rgba(255,255,255,0.05)" strokeWidth={1}>
                  <title>{row} × {col}: {fmt(v)}</title>
                </rect>
                {CELL_W > 30 && CELL_H > 20 && (
                  <text x={PL + ci * CELL_W + CELL_W / 2} y={PT + ri * CELL_H + CELL_H / 2 + 4}
                    fontSize={8} fill="rgba(255,255,255,0.75)" textAnchor="middle">
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          })
        )}
        <text x={PL + (CELL_W * cols.length) / 2} y={H - 4} fontSize={10} fill={TX} textAnchor="middle">{xLabel}</text>
        <text x={8} y={PT + (CELL_H * rows.length) / 2} fontSize={10} fill={TX} textAnchor="middle"
          transform={`rotate(-90,8,${PT + (CELL_H * rows.length) / 2})`}>{yLabel}</text>
      </svg>
      <p className="text-[10px] text-gray-500 mt-1">Color intensity = {vLabel}</p>
    </div>
  );
}

// ── TreemapChart ───────────────────────────────────────────────────────────────
interface TRect { label: string; value: number; x: number; y: number; w: number; h: number }

function sliceDice(
  items: { label: string; value: number }[],
  x: number, y: number, w: number, h: number, horiz: boolean,
): TRect[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], x, y, w, h }];
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0, split = Math.floor(items.length / 2);
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].value;
    if (acc >= total / 2) { split = i + 1; break; }
  }
  const r1 = items.slice(0, split), r2 = items.slice(split);
  const ratio = r1.reduce((s, i) => s + i.value, 0) / total;
  if (horiz) {
    const w1 = w * ratio;
    return [...sliceDice(r1, x, y, w1, h, !horiz), ...sliceDice(r2, x + w1, y, w - w1, h, !horiz)];
  }
  const h1 = h * ratio;
  return [...sliceDice(r1, x, y, w, h1, !horiz), ...sliceDice(r2, x, y + h1, w, h - h1, !horiz)];
}

export function TreemapChart({ labels, values, xLabel }: { labels: string[]; values: number[]; xLabel: string }) {
  const W = 560, H = 260;
  const sorted = labels
    .map((l, i) => ({ label: l, value: values[i] }))
    .sort((a, b) => b.value - a.value);
  const rects = sliceDice(sorted, 0, 0, W, H, true);
  const maxV = Math.max(...values, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {rects.map((r, i) => {
        const t = r.value / maxV;
        const color = SERIES_COLORS[i % SERIES_COLORS.length];
        return (
          <g key={i}>
            <rect x={r.x + 1} y={r.y + 1}
              width={Math.max(r.w - 2, 0)} height={Math.max(r.h - 2, 0)}
              fill={color} opacity={0.18 + t * 0.65}
              rx={3} stroke="rgba(0,0,0,0.35)" strokeWidth={1}>
              <title>{r.label}: {fmt(r.value)}</title>
            </rect>
            {r.w > 48 && r.h > 22 && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 - (r.h > 38 ? 6 : 0)}
                fontSize={Math.min(11, r.w / 9)} fill="white" textAnchor="middle"
                style={{ pointerEvents: "none" }}>
                {String(r.label).slice(0, Math.floor(r.w / 7))}
              </text>
            )}
            {r.w > 48 && r.h > 38 && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 11}
                fontSize={9} fill="rgba(255,255,255,0.65)" textAnchor="middle"
                style={{ pointerEvents: "none" }}>
                {fmt(r.value)}
              </text>
            )}
          </g>
        );
      })}
      <text x={W / 2} y={H - 3} fontSize={10} fill={TX} textAnchor="middle">{xLabel}</text>
    </svg>
  );
}