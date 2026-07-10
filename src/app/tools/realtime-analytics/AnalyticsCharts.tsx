"use client";

export interface PerMinute { minute: string; count: number; }
export interface TopPage   { path: string;   count: number; }
export interface ByType    { type: string;   count: number; }

const P = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#14b8a6","#f97316"];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

// ── Sparkline (events/min) ─────────────────────────────────────────────────
export function Sparkline({ data }: { data: PerMinute[] }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-600">No data yet</div>;
  const W = 480, H = 80, PL = 32, PR = 8, PT = 8, PB = 20;
  const iW = W - PL - PR, iH = H - PT - PB;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => {
    const x = PL + (i / Math.max(data.length - 1, 1)) * iW;
    const y = PT + (1 - d.count / max) * iH;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(" L")} L${PL + iW},${PT + iH} L${PL},${PT + iH} Z`;
  const line = `M${pts.join(" L")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={PL} y1={PT} x2={PL} y2={PT+iH} stroke="#ffffff0e" strokeWidth="1"/>
      <line x1={PL} y1={PT+iH} x2={PL+iW} y2={PT+iH} stroke="#ffffff0e" strokeWidth="1"/>
      <text x={PL-4} y={PT+4} textAnchor="end" fontSize="8" fill="#6b7280">{fmt(max)}</text>
      <text x={PL-4} y={PT+iH} textAnchor="end" fontSize="8" fill="#6b7280">0</text>
      <path d={area} fill="url(#sg)"/>
      <path d={line} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.length <= 10 && data.map((d, i) => {
        const x = PL + (i / Math.max(data.length-1,1)) * iW;
        const y = PT + (1 - d.count / max) * iH;
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#10b981"/>;
      })}
      <text x={PL} y={H-4} fontSize="8" fill="#6b7280">{data[0]?.minute}</text>
      <text x={PL+iW} y={H-4} textAnchor="end" fontSize="8" fill="#6b7280">{data[data.length-1]?.minute}</text>
    </svg>
  );
}

// ── Horizontal bar (top pages) ────────────────────────────────────────────
export function TopPagesBar({ data }: { data: TopPage[] }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-600">No data yet</div>;
  const shown = data.slice(0, 8);
  const max = Math.max(...shown.map(d => d.count), 1);
  const ROW = 22, W = 480, PL = 130, PR = 48, PT = 4;
  const svgH = PT + shown.length * ROW;

  return (
    <div className="max-h-52 overflow-y-auto">
      <svg viewBox={`0 0 ${W} ${svgH}`} style={{ height: svgH }} className="w-full">
        {shown.map((d, i) => {
          const y = PT + i * ROW;
          const bW = Math.max(((d.count / max) * (W - PL - PR)), 4);
          const label = d.path.length > 22 ? d.path.slice(0, 21) + "…" : d.path;
          return (
            <g key={i}>
              <text x={PL-6} y={y+13} textAnchor="end" fontSize="9" fill="#9ca3af">{label || "/"}</text>
              <rect x={PL} y={y+3} width={bW} height={13} rx="3" fill="#10b981" opacity="0.75"/>
              <text x={PL+bW+4} y={y+13} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Donut (by type) ───────────────────────────────────────────────────────
export function TypeDonut({ data }: { data: ByType[] }) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-600">No data yet</div>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const CX = 70, CY = 70, R = 54, r = 30;
  let angle = -Math.PI / 2;
  const slices = data.slice(0, 8).map((d, i) => {
    const frac = d.count / total;
    const a0 = angle, a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const xi0 = CX + r * Math.cos(a0), yi0 = CY + r * Math.sin(a0);
    const xi1 = CX + r * Math.cos(a1), yi1 = CY + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return { d: `M${xi0},${yi0} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi0},${yi0} Z`, color: P[i % P.length], label: d.type, count: d.count, pct: Math.round(frac * 100) };
  });

  return (
    <svg viewBox="0 0 360 140" className="w-full">
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} opacity="0.85"/>)}
      <text x={CX} y={CY+4} textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="600">{total.toLocaleString()}</text>
      <text x={CX} y={CY+15} textAnchor="middle" fontSize="7" fill="#6b7280">total</text>
      {slices.map((s, i) => (
        <g key={i} transform={`translate(155, ${10 + i * 16})`}>
          <rect width="8" height="8" rx="2" fill={s.color} opacity="0.85"/>
          <text x="12" y="8" fontSize="9" fill="#9ca3af">{s.label} — {s.pct}%</text>
        </g>
      ))}
    </svg>
  );
}