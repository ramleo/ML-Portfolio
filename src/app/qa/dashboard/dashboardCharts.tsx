"use client";

import { useEffect, useRef, useState } from "react";
import type { SeqPoint } from "./dashboardData";

export const PASS = "#34d399", FAIL = "#f43f5e", ERR = "#f59e0b";

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
export function useCountUp(value: number, ms = 700): number {
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

/** Animated pass-rate donut. rate is 0..1 or null (nothing decided). */
export function Ring({ rate, label }: { rate: number | null; label?: string }) {
  const reduced = useReducedMotion();
  const R = 54, C = 2 * Math.PI * R;
  const target = (rate ?? 0) * C;
  const [dash, setDash] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setDash(target)); return () => cancelAnimationFrame(id); }, [target]);
  const pct = useCountUp(rate == null ? 0 : Math.round(rate * 100));
  return (
    <svg viewBox="0 0 140 140" width="132" height="132" role="img"
      aria-label={`${label ?? "Pass rate"} ${rate == null ? "n/a" : Math.round(rate * 100) + "%"}`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface)" strokeWidth="12" />
      <circle cx="70" cy="70" r={R} fill="none" stroke={PASS} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${dash} ${C}`} transform="rotate(-90 70 70)"
        style={{ transition: reduced ? undefined : "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)" }} />
      <text x="70" y="66" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--text)">
        {rate == null ? "—" : `${Math.round(pct)}%`}
      </text>
      <text x="70" y="88" textAnchor="middle" fontSize="11" fill="var(--text3)">pass rate</text>
    </svg>
  );
}

/** Cumulative pass-rate trend over runs (oldest→newest), drawn in on mount, with
 *  hover dots (native tooltips). One series → no legend; the title names it. */
export function TrendChart({ sequence, accent }: { sequence: SeqPoint[]; accent: string }) {
  const reduced = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = useState(reduced);
  useEffect(() => {
    if (reduced) { setDrawn(true); return; }
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  // cumulative pass rate per run (errors excluded from the ratio)
  const pts: { x: number; y: number; rate: number; label: string }[] = [];
  let pass = 0, decided = 0;
  const W = 720, H = 140, padX = 8, padY = 14;
  const n = sequence.length;
  sequence.forEach((s, i) => {
    if (s.status === "passed") { pass++; decided++; }
    else if (s.status === "failed") { decided++; }
    const rate = decided ? pass / decided : 0;
    const x = n <= 1 ? padX : padX + (i * (W - 2 * padX)) / (n - 1);
    const y = padY + (1 - rate) * (H - 2 * padY);
    pts.push({ x, y, rate, label: `${new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${Math.round(rate * 100)}%` });
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${H - padY} L${pts[0].x.toFixed(1)} ${H - padY} Z` : "";
  const len = 2000; // generous upper bound for stroke-dash draw-in

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="150" preserveAspectRatio="none"
      role="img" aria-label="Pass-rate trend over runs">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={padY + g * (H - 2 * padY)} y2={padY + g * (H - 2 * padY)}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
      ))}
      {area && <path d={area} fill="url(#trendFill)" opacity={drawn ? 1 : 0}
        style={{ transition: reduced ? undefined : "opacity 700ms ease-out 300ms" }} />}
      <path ref={pathRef} d={line} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={len} strokeDashoffset={drawn ? 0 : len}
        style={{ transition: reduced ? undefined : "stroke-dashoffset 1100ms cubic-bezier(.22,1,.36,1)" }} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={accent} stroke="var(--bg-card)" strokeWidth="2"
          opacity={drawn ? 1 : 0} style={{ transition: reduced ? undefined : `opacity 300ms ease-out ${300 + i * 40}ms` }}>
          <title>{p.label}</title>
        </circle>
      ))}
    </svg>
  );
}
