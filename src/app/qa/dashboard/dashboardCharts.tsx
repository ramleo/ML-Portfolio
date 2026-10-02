"use client";

import { useEffect, useRef, useState } from "react";
import type { SeqPoint } from "./dashboardData";

// Status palette (reserved + always labelled). Vivid shades for fills; darker shades
// for inline numeric TEXT, which needs WCAG contrast on a light surface.
export const PASS = "#34d399", FAIL = "#f43f5e", ERR = "#f59e0b";
export const PASS_TEXT = "#059669", FAIL_TEXT = "#e11d48", ERR_TEXT = "#d97706";

/** Respect the viewer's reduced-motion preference — animations become instant. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Animate a number from 0 to `value` with requestAnimationFrame (ease-out). */
export function useCountUp(value: number, ms = 800): number {
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced || ms <= 0) { setN(value); return; }
    const start = performance.now(); const a = from.current; const b = value;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(a + (b - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, reduced]);
  return n;
}

/** Hero pass-rate gauge: a thick 270° arc with a gradient stroke and a soft glow,
 *  over a recessive track. rate is 0..1 or null (nothing decided yet). */
export function Gauge({ rate, caption }: { rate: number | null; caption?: string }) {
  const reduced = useReducedMotion();
  const R = 58, CX = 80, CY = 80;
  const SWEEP = 270; // degrees of arc (gap at the bottom)
  const START = 135; // start angle (bottom-left), going clockwise
  const full = (SWEEP / 360) * 2 * Math.PI * R; // arc length of the full track
  const target = (rate ?? 0) * full;
  const [dash, setDash] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setDash(target)); return () => cancelAnimationFrame(id); }, [target]);
  const pct = useCountUp(rate == null ? 0 : Math.round(rate * 100));

  // Arc path from START, sweeping SWEEP degrees clockwise.
  const pt = (ang: number) => {
    const r = (ang * Math.PI) / 180;
    return [CX + R * Math.cos(r), CY + R * Math.sin(r)];
  };
  const [x0, y0] = pt(START);
  const [x1, y1] = pt(START + SWEEP);
  const large = SWEEP > 180 ? 1 : 0;
  const arc = `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  const tone = rate == null ? "var(--text3)" : rate >= 0.8 ? PASS_TEXT : rate >= 0.5 ? ERR_TEXT : FAIL_TEXT;

  return (
    <svg viewBox="0 0 160 160" width="168" height="168" role="img"
      aria-label={`Pass rate ${rate == null ? "not available" : Math.round(rate * 100) + " percent"}`}>
      <defs>
        <linearGradient id="gaugeStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={FAIL} />
          <stop offset="55%" stopColor={ERR} />
          <stop offset="100%" stopColor={PASS} />
        </linearGradient>
        <filter id="gaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* recessive track */}
      <path d={arc} fill="none" stroke="var(--surface)" strokeWidth="13" strokeLinecap="round" />
      {/* value arc, drawn in */}
      <path d={arc} fill="none" stroke="url(#gaugeStroke)" strokeWidth="13" strokeLinecap="round"
        filter="url(#gaugeGlow)" strokeDasharray={`${dash} ${full * 2}`}
        style={{ transition: reduced ? undefined : "stroke-dasharray 1000ms cubic-bezier(.22,1,.36,1)" }} />
      <text x={CX} y={CY - 2} textAnchor="middle" fontSize="36" fontWeight="800" fill={tone}
        style={{ letterSpacing: "-0.02em" }}>
        {rate == null ? "—" : `${Math.round(pct)}`}
        {rate != null && <tspan fontSize="18" fontWeight="700" dy="-1">%</tspan>}
      </text>
      <text x={CX} y={CY + 20} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text3)"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>pass rate</text>
      {caption && <text x={CX} y={CY + 40} textAnchor="middle" fontSize="11" fill="var(--text3)">{caption}</text>}
    </svg>
  );
}

/** Cumulative pass-rate trend over runs (oldest→newest): gradient area + line drawn
 *  in on mount, y-axis % ticks, an emphasized current point. One series → no legend. */
export function TrendChart({ sequence, accent }: { sequence: SeqPoint[]; accent: string }) {
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(reduced);
  useEffect(() => {
    if (reduced) { setDrawn(true); return; }
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const W = 720, H = 180, padL = 34, padR = 12, padY = 16;
  const pts: { x: number; y: number; rate: number; label: string }[] = [];
  let pass = 0, decided = 0;
  const n = sequence.length;
  sequence.forEach((s, i) => {
    if (s.status === "passed") { pass++; decided++; }
    else if (s.status === "failed") { decided++; }
    const rate = decided ? pass / decided : 0;
    const x = n <= 1 ? padL : padL + (i * (W - padL - padR)) / (n - 1);
    const y = padY + (1 - rate) * (H - 2 * padY);
    pts.push({ x, y, rate, label: `${new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${Math.round(rate * 100)}%` });
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${H - padY} L${pts[0].x.toFixed(1)} ${H - padY} Z` : "";
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="190" role="img" aria-label="Pass-rate trend over runs">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.30" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 0.5, 0].map((g) => {
        const y = padY + (1 - g) * (H - 2 * padY);
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" opacity="0.55" />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--text3)" style={{ fontVariantNumeric: "tabular-nums" }}>{g * 100}%</text>
          </g>
        );
      })}
      {area && <path d={area} fill="url(#trendFill)" opacity={drawn ? 1 : 0}
        style={{ transition: reduced ? undefined : "opacity 700ms ease-out 300ms" }} />}
      <path d={line} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={2000} strokeDashoffset={drawn ? 0 : 2000}
        style={{ transition: reduced ? undefined : "stroke-dashoffset 1100ms cubic-bezier(.22,1,.36,1)" }} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5.5 : 3.5}
          fill={i === pts.length - 1 ? accent : "var(--bg-card)"} stroke={accent} strokeWidth="2"
          opacity={drawn ? 1 : 0} style={{ transition: reduced ? undefined : `opacity 300ms ease-out ${300 + i * 35}ms` }}>
          <title>{p.label}</title>
        </circle>
      ))}
      {last && drawn && (
        <circle cx={last.x} cy={last.y} r="5.5" fill="none" stroke={accent} strokeWidth="2" opacity="0.5">
          {!reduced && <animate attributeName="r" values="5.5;11;5.5" dur="2.4s" repeatCount="indefinite" />}
          {!reduced && <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />}
        </circle>
      )}
    </svg>
  );
}
