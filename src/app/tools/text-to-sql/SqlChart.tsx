"use client";

// ── Palette & shared constants ─────────────────────────────────────────────────
export const SERIES_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#34d399", "#f472b6"];
const G  = "rgba(255,255,255,0.05)";
const AX = "#3f3f46";
const TX = "#71717a";

// ── Shared helpers ─────────────────────────────────────────────────────────────
function fmt(v: number): string {
  if (!isFinite(v)) return "0";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1_000_000) return `${s}${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `${s}${(a / 1_000).toFixed(1)}k`;
  return String(Number.isInteger(v) ? v : parseFloat(v.toFixed(2)));
}

function hGrid(pt: number, chartH: number, maxV: number, n = 4) {
  return Array.from({ length: n + 1 }, (_, i) => ({
    y: pt + (chartH / n) * i,
    val: maxV * (1 - i / n),
  }));
}

function bezier(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${mx} ${pts[i - 1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

function donutArc(cx: number, cy: number, R: number, Ri: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [ox, oy] = p(R, a0), [ex, ey] = p(R, a1);
  const [ix, iy] = p(Ri, a1), [jx, jy] = p(Ri, a0);
  const lg = a1 - a0 > Math.PI ? 1 : 0;
  return `M${ox} ${oy} A${R} ${R} 0 ${lg} 1 ${ex} ${ey} L${ix} ${iy} A${Ri} ${Ri} 0 ${lg} 0 ${jx} ${jy}Z`;
}

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface S1 { labels: string[]; values: number[]; xLabel: string; yLabel: string; accent: string; onLabelClick?: (label: string, value: number) => void; }
interface SP { x: number[]; y: number[]; xLabel: string; yLabel: string; accent: string; labels?: string[]; }
interface MB { labels: string[]; series: { name: string; values: number[] }[]; xLabel: string; yLabel: string; }
interface SC { value: string; label: string; accent: string; }

// ── BarChart ───────────────────────────────────────────────────────────────────
export function BarChart({ labels, values, xLabel, yLabel, accent, onLabelClick }: S1) {
  const W = 560, H = 230, PL = 52, PR = 16, PT = 28, PB = 60;
  const cW = W - PL - PR, cH = H - PT - PB;
  const max = Math.max(...values, 1);
  const bW  = Math.max(6, cW / labels.length - 5);
  const avgLen = labels.reduce((s, l) => s + String(l).length, 0) / Math.max(labels.length, 1);
  const rotateLabels = (cW / labels.length) < avgLen * 6.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }}>
      <defs>
        <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={0.9} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.3} />
        </linearGradient>
      </defs>
      {hGrid(PT, cH, max).map(({ y, val }, i) => (
        <g key={i}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={G} strokeDasharray="4 4" />
          <text x={PL - 5} y={y + 4} fontSize={8} fill={TX} textAnchor="end">{fmt(val)}</text>
        </g>
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AX} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AX} />
      {values.map((v, i) => {
        const bH = (v / max) * cH;
        const x  = PL + i * (cW / labels.length) + 2;
        const y  = H - PB - bH;
        return (
          <g key={i} onClick={() => onLabelClick?.(labels[i], v)}
            style={{ cursor: onLabelClick ? "pointer" : "default" }}>
            <rect x={x} y={y} width={bW} height={bH} fill="url(#bg1)" rx={3}
              className={onLabelClick ? "hover:opacity-75 transition-opacity" : ""}>
              <title>{labels[i]}: {fmt(v)}{onLabelClick ? " — click to drill down" : ""}</title>
            </rect>
            <text x={x + bW / 2} y={y - 4} fontSize={9} fill={accent} textAnchor="middle">{fmt(v)}</text>
            <text x={x + bW / 2} y={H - PB + 14} fontSize={9} fill={TX}
              textAnchor={rotateLabels ? "end" : "middle"}
              transform={rotateLabels ? `rotate(-38,${x + bW / 2},${H - PB + 14})` : undefined}>
              {String(labels[i]).slice(0, 14)}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 2} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
      <text x={10} y={H / 2} fontSize={11} fill={TX} textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

// ── HorizontalBarChart ─────────────────────────────────────────────────────────
export function HorizontalBarChart({ labels, values, xLabel, yLabel, accent, onLabelClick }: S1) {
  const W = 560, H = Math.min(360, Math.max(160, labels.length * 30 + 50));
  const PL = 140, PR = 60, PT = 16, PB = 30;
  const cW = W - PL - PR, cH = H - PT - PB;
  const max = Math.max(...values, 1);
  const bH  = Math.max(10, cH / labels.length - 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <defs>
        <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AX} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AX} />
      {values.map((v, i) => {
        const bW = (v / max) * cW;
        const y  = PT + i * (cH / labels.length) + 2;
        return (
          <g key={i} onClick={() => onLabelClick?.(labels[i], v)}
            style={{ cursor: onLabelClick ? "pointer" : "default" }}>
            <rect x={PL} y={y} width={bW} height={bH} fill="url(#hg1)" rx={3}
              className={onLabelClick ? "hover:opacity-75 transition-opacity" : ""}>
              <title>{labels[i]}: {fmt(v)}{onLabelClick ? " — click to drill down" : ""}</title>
            </rect>
            <text x={PL - 6} y={y + bH / 2 + 4} fontSize={10} fill={TX} textAnchor="end">{String(labels[i]).slice(0, 20)}</text>
            <text x={PL + bW + 5} y={y + bH / 2 + 4} fontSize={9} fill={accent}>{fmt(v)}</text>
          </g>
        );
      })}
      <text x={PL + cW / 2} y={H - 4} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
      <text x={10} y={H / 2} fontSize={11} fill={TX} textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

// ── AreaChart ──────────────────────────────────────────────────────────────────
export function AreaChart({ labels, values, xLabel, yLabel, accent }: S1) {
  const W = 560, H = 210, PL = 52, PR = 16, PT = 24, PB = 52;
  const cW = W - PL - PR, cH = H - PT - PB;
  const max = Math.max(...values, 1), min = Math.min(...values, 0), rng = max - min || 1;
  const n   = values.length;
  const pts = values.map((v, i) => ({
    x: PL + (i / Math.max(n - 1, 1)) * cW,
    y: H - PB - ((v - min) / rng) * cH,
  }));
  const line = bezier(pts);
  const area = line + ` L${pts[n - 1].x} ${H - PB} L${PL} ${H - PB}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 210 }}>
      <defs>
        <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {hGrid(PT, cH, max, 3).map(({ y, val }, i) => (
        <g key={i}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={G} strokeDasharray="4 4" />
          <text x={PL - 5} y={y + 4} fontSize={8} fill={TX} textAnchor="end">{fmt(val)}</text>
        </g>
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AX} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AX} />
      <path d={area} fill="url(#ag1)" />
      <path d={line} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map(({ x, y }, i) => {
        const show = i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.5} fill={accent}>
              <title>{labels[i]}: {fmt(values[i])}</title>
            </circle>
            {show && <text x={x} y={H - PB + 14} fontSize={9} fill={TX} textAnchor="middle">{String(labels[i]).slice(0, 10)}</text>}
          </g>
        );
      })}
      <text x={W / 2} y={H - 2} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
      <text x={10} y={H / 2} fontSize={11} fill={TX} textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

// ── ScatterChart ───────────────────────────────────────────────────────────────
export function ScatterChart({ x, y, xLabel, yLabel, accent, labels }: SP) {
  const W = 560, H = 230, PL = 52, PR = 16, PT = 20, PB = 48;
  const cW = W - PL - PR, cH = H - PT - PB;
  const xMax = Math.max(...x, 1), xMin = Math.min(...x, 0), xR = xMax - xMin || 1;
  const yMax = Math.max(...y, 1), yMin = Math.min(...y, 0), yR = yMax - yMin || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line x1={PL} y1={PT + (1 - t) * cH} x2={W - PR} y2={PT + (1 - t) * cH} stroke={G} strokeDasharray="4 4" />
          <line x1={PL + t * cW} y1={PT} x2={PL + t * cW} y2={H - PB} stroke={G} strokeDasharray="4 4" />
          <text x={PL - 5} y={PT + (1 - t) * cH + 4} fontSize={8} fill={TX} textAnchor="end">{fmt(yMin + t * yR)}</text>
          <text x={PL + t * cW} y={H - PB + 14} fontSize={8} fill={TX} textAnchor="middle">{fmt(xMin + t * xR)}</text>
        </g>
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AX} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AX} />
      {x.map((xv, i) => (
        <circle key={i}
          cx={PL + ((xv - xMin) / xR) * cW}
          cy={H - PB - ((y[i] - yMin) / yR) * cH}
          r={4} fill={accent} fillOpacity={0.65} stroke={accent} strokeOpacity={0.25} strokeWidth={1.5}>
          <title>{labels?.[i] ? `${labels[i]} — ` : ""}{xLabel}: {fmt(xv)}, {yLabel}: {fmt(y[i])}</title>
        </circle>
      ))}
      <text x={W / 2} y={H - 2} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
      <text x={10} y={H / 2} fontSize={11} fill={TX} textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

// ── DonutChart ─────────────────────────────────────────────────────────────────
export function DonutChart({ labels, values, xLabel, accent }: Omit<S1, "yLabel"> & { accent: string }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const W = 420, H = 230, cx = 115, cy = 115, R = 95, Ri = 54;
  let angle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const sweep = (v / total) * 2 * Math.PI;
    const a0 = angle; angle += sweep;
    return { path: donutArc(cx, cy, R, Ri, a0, angle), color: SERIES_COLORS[i % SERIES_COLORS.length], v };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.88} stroke="#0a0a0f" strokeWidth={2}>
          <title>{labels[i]}: {fmt(s.v)} ({((s.v / total) * 100).toFixed(1)}%)</title>
        </path>
      ))}
      <text x={cx} y={cy - 8} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
      <text x={cx} y={cy + 12} fontSize={18} fontWeight="bold" fill={accent} textAnchor="middle">{fmt(total)}</text>
      <text x={cx} y={cy + 27} fontSize={9} fill={TX} textAnchor="middle">total</text>
      {slices.map((s, i) => (
        <g key={i} transform={`translate(240,${20 + i * 26})`}>
          <rect width={10} height={10} rx={2} fill={s.color} opacity={0.88} />
          <text x={14} y={10} fontSize={10} fill={TX}>{String(labels[i]).slice(0, 22)} — {fmt(s.v)}</text>
        </g>
      ))}
    </svg>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
export function StatCard({ value, label, accent }: SC) {
  const n = Number(String(value).replace(/,/g, ""));
  const display = isFinite(n) ? n.toLocaleString() : value;
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <p className="text-xs uppercase tracking-widest font-medium" style={{ color: accent }}>{label}</p>
      <p className="text-6xl font-bold tabular-nums leading-none" style={{ color: "white" }}>{display}</p>
    </div>
  );
}

// ── MultiBarChart ──────────────────────────────────────────────────────────────
export function MultiBarChart({ labels, series, xLabel }: MB) {
  const W = 560, H = 230, PL = 52, PR = 90, PT = 28, PB = 60;
  const cW = W - PL - PR, cH = H - PT - PB;
  const allVals = series.flatMap(s => s.values);
  const max = Math.max(...allVals, 1);
  const gW  = cW / labels.length;
  const bW  = Math.max(4, gW / series.length - 2);
  const avgLen = labels.reduce((s, l) => s + String(l).length, 0) / Math.max(labels.length, 1);
  const rotateLabels = gW < avgLen * 6.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 230 }}>
      {hGrid(PT, cH, max).map(({ y, val }, i) => (
        <g key={i}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={G} strokeDasharray="4 4" />
          <text x={PL - 5} y={y + 4} fontSize={8} fill={TX} textAnchor="end">{fmt(val)}</text>
        </g>
      ))}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={AX} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={AX} />
      {labels.map((lbl, gi) =>
        series.map((s, si) => {
          const v  = s.values[gi] ?? 0;
          const bH = (v / max) * cH;
          const x  = PL + gi * gW + si * (bW + 2) + 2;
          const y  = H - PB - bH;
          return (
            <g key={`${gi}-${si}`}>
              <rect x={x} y={y} width={bW} height={bH}
                fill={SERIES_COLORS[si % SERIES_COLORS.length]} rx={2} opacity={0.85}>
                <title>{s.name} / {lbl}: {fmt(v)}</title>
              </rect>
              {bH > 12 && bW > 10 && <text x={x + bW / 2} y={y - 3} fontSize={7} fill={SERIES_COLORS[si % SERIES_COLORS.length]} textAnchor="middle" opacity={0.9}>{fmt(v)}</text>}
            </g>
          );
        })
      )}
      {labels.map((lbl, gi) => {
        const lx = PL + gi * gW + gW / 2;
        return (
          <text key={gi} x={lx} y={H - PB + 14} fontSize={9} fill={TX}
            textAnchor={rotateLabels ? "end" : "middle"}
            transform={rotateLabels ? `rotate(-38,${lx},${H - PB + 14})` : undefined}>
            {String(lbl).slice(0, 14)}
          </text>
        );
      })}
      {series.map((s, i) => (
        <g key={i} transform={`translate(${W - PR + 6},${PT + i * 18})`}>
          <rect width={8} height={8} rx={1} fill={SERIES_COLORS[i % SERIES_COLORS.length]} opacity={0.85} />
          <text x={12} y={8} fontSize={9} fill={TX}>{s.name.slice(0, 14)}</text>
        </g>
      ))}
      <text x={PL + cW / 2} y={H - 2} fontSize={11} fill={TX} textAnchor="middle">{xLabel}</text>
    </svg>
  );
}

// LineChart kept as alias — backend emits "area" for time series now
export const LineChart = AreaChart;