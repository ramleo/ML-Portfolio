"use client";

interface BarChartProps {
  labels: string[];
  values: number[];
  xLabel: string;
  yLabel: string;
  accent: string;
}

interface LineChartProps {
  labels: string[];
  values: number[];
  xLabel: string;
  yLabel: string;
  accent: string;
}

export function BarChart({ labels, values, xLabel, yLabel, accent }: BarChartProps) {
  const W = 560, H = 220, PL = 50, PR = 16, PT = 24, PB = 56;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const maxVal = Math.max(...values, 1);
  const barW   = Math.max(6, chartW / labels.length - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* y-axis */}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="#555" strokeWidth={1} />
      {/* x-axis */}
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#555" strokeWidth={1} />
      {values.map((v, i) => {
        const barH = (v / maxVal) * chartH;
        const x    = PL + i * (chartW / labels.length) + 2;
        const y    = H - PB - barH;
        const lbl  = String(labels[i]).slice(0, 14);
        const valStr = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={accent} rx={2} opacity={0.85} />
            <text x={x + barW / 2} y={y - 4} fontSize={9} fill={accent} textAnchor="middle">{valStr}</text>
            <text x={x + barW / 2} y={H - PB + 14} fontSize={9} fill="#aaa" textAnchor="end"
              transform={`rotate(-35,${x + barW / 2},${H - PB + 14})`}>{lbl}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 4} fontSize={10} fill="#888" textAnchor="middle">{xLabel}</text>
      <text x={10} y={H / 2} fontSize={10} fill="#888" textAnchor="middle"
        transform={`rotate(-90,10,${H / 2})`}>{yLabel}</text>
    </svg>
  );
}

export function LineChart({ labels, values, xLabel, yLabel, accent }: LineChartProps) {
  const W = 560, H = 200, PL = 50, PR = 16, PT = 20, PB = 50;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range  = maxVal - minVal || 1;

  const points = values.map((v, i) => {
    const px = PL + (i / Math.max(values.length - 1, 1)) * chartW;
    const py = H - PB - ((v - minVal) / range) * chartH;
    return `${px},${py}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="#555" strokeWidth={1} />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#555" strokeWidth={1} />
      <polyline points={points.join(" ")} fill="none" stroke={accent} strokeWidth={2} />
      {values.map((_, i) => {
        const [px, py] = points[i].split(",").map(Number);
        const lbl = String(labels[i]).slice(0, 10);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={3} fill={accent} />
            {i % Math.ceil(values.length / 8) === 0 && (
              <text x={px} y={H - PB + 14} fontSize={9} fill="#aaa" textAnchor="middle">{lbl}</text>
            )}
          </g>
        );
      })}
      <text x={W / 2} y={H - 2} fontSize={10} fill="#888" textAnchor="middle">{xLabel}</text>
    </svg>
  );
}