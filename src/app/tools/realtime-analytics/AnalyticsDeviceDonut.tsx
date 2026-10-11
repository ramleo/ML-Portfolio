"use client";

const P = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#14b8a6","#f97316"];
const COLORS: Record<string, string> = { desktop: "#6366f1", mobile: "#10b981" };

export function DeviceDonut({ data }: { data: { device: string; count: number }[] }) {
  if (!data.length) return <div className="h-10 flex items-center text-xs text-[var(--text3)]">No device data yet</div>;

  const total = data.reduce((s, d) => s + d.count, 0);

  // Single device — SVG arcs break at 100%; render as simple chips instead
  if (data.length === 1) {
    const color = COLORS[data[0].device] ?? P[0];
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
        <span className="text-[11px] font-semibold text-[var(--text)] capitalize">{data[0].device}</span>
        <span className="text-[11px] tabular-nums" style={{ color }}>100%</span>
        <span className="text-[10px] text-[var(--text3)]">· {total} sessions</span>
      </div>
    );
  }

  // Same geometry + font sizes as TypeDonut (AnalyticsCharts) so the two donuts in
  // this card render at identical scale — both share a 360x140 viewBox at w-full.
  const CX = 70, CY = 70, R = 54, r = 30;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const frac = d.count / total;
    const a0 = angle, a1 = angle + frac * 2 * Math.PI; angle = a1;
    const mid = (a0 + a1) / 2, lR = (R + r) / 2;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const xi0 = CX + r * Math.cos(a0), yi0 = CY + r * Math.sin(a0);
    const xi1 = CX + r * Math.cos(a1), yi1 = CY + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return {
      d: `M${xi0},${yi0} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi0},${yi0} Z`,
      color: COLORS[d.device] ?? P[i % P.length], label: d.device, count: d.count,
      pct: Math.round(frac * 100), lx: CX + lR * Math.cos(mid), ly: CY + lR * Math.sin(mid),
    };
  });
  return (
    <svg viewBox="0 0 360 140" className="w-full">
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} opacity="0.85"/>)}
      {slices.map((s, i) => s.pct >= 8 && (
        <text key={i} x={s.lx} y={s.ly + 3.5} textAnchor="middle" fontSize="8.5" fill="#fff" fontWeight="700" opacity="0.9" pointerEvents="none">{s.pct}%</text>
      ))}
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fill="var(--text)" fontWeight="600">{total.toLocaleString()}</text>
      <text x={CX} y={CY + 15} textAnchor="middle" fontSize="7" fill="var(--text3)">sessions</text>
      {slices.map((s, i) => (
        <g key={i} transform={`translate(155, ${10 + i * 16})`}>
          <rect width="8" height="8" rx="2" fill={s.color} opacity="0.85"/>
          <text x="12" y="8" fontSize="9" fill="var(--text2)" className="capitalize">{s.label} — {s.pct}%</text>
        </g>
      ))}
    </svg>
  );
}