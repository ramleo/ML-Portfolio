"use client";

import { useState } from "react";
import { pathLabel } from "./AnalyticsQueryByTool";

export interface PerMinute    { minute: string; count: number; }
export interface TopPage      { path: string;   count: number; }
export interface ByType       { type: string;   count: number; }
export interface Country      { country: string; count: number; }
export interface Funnel       { page_view: number; tool_open: number; query_run: number; }
export interface Referrer     { referrer: string; count: number; }
export interface ProviderStat { provider: string; count: number; }
export interface ModelStat    { model: string;    count: number; }

const P = ["#6366f1","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899","#14b8a6","#f97316"];

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

// ── Sparkline with anomaly markers + hover tooltip ────────────────────────────
export function Sparkline({ data, color = "#10b981" }: { data: PerMinute[]; color?: string }) {
  const [tip, setTip] = useState<{ x: number; y: number; minute: string; count: number } | null>(null);
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-600">No data yet</div>;
  const gid = `sg-${color.replace("#", "")}`;
  const W = 480, H = 80, PL = 32, PR = 8, PT = 8, PB = 20;
  const iW = W - PL - PR, iH = H - PT - PB;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => {
    const x = PL + (i / Math.max(data.length - 1, 1)) * iW;
    const y = PT + (1 - d.count / max) * iH;
    return { x, y, ...d };
  });
  const area = `M${pts[0].x},${pts[0].y} L${pts.map(p => `${p.x},${p.y}`).join(" L")} L${PL + iW},${PT + iH} L${PL},${PT + iH} Z`;
  const line = `M${pts.map(p => `${p.x},${p.y}`).join(" L")}`;
  const counts = data.map(d => d.count);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const std = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length);
  const threshold = mean + 2 * std;
  const colW = data.length > 1 ? iW / (data.length - 1) : iW;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={PL} y1={PT} x2={PL} y2={PT+iH} stroke="#ffffff0e" strokeWidth="1"/>
      <line x1={PL} y1={PT+iH} x2={PL+iW} y2={PT+iH} stroke="#ffffff0e" strokeWidth="1"/>
      <text x={PL-4} y={PT+4} textAnchor="end" fontSize="8" fill="#6b7280">{fmt(max)}</text>
      <text x={PL-4} y={PT+iH} textAnchor="end" fontSize="8" fill="#6b7280">0</text>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => p.count > threshold && std > 0 ? (
        <g key={i}>
          <circle cx={p.x} cy={p.y - 5} r="3" fill="#ef4444" opacity="0.85"/>
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="6" fill="#ef4444">↑</text>
        </g>
      ) : data.length <= 10 ? (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color}/>
      ) : null)}
      <text x={PL} y={H-4} fontSize="8" fill="#6b7280">{data[0]?.minute}</text>
      <text x={PL+iW} y={H-4} textAnchor="end" fontSize="8" fill="#6b7280">{data[data.length-1]?.minute}</text>
      {/* Hover capture rects */}
      {pts.map((p, i) => (
        <rect key={i} x={p.x - colW / 2} y={PT} width={colW} height={iH}
          fill="transparent"
          onMouseEnter={() => setTip({ x: p.x, y: p.y, minute: p.minute, count: p.count })}/>
      ))}
      {/* Tooltip */}
      {tip && (() => {
        const TW = 90, TH = 16;
        const tx = Math.min(Math.max(tip.x - TW / 2, PL), PL + iW - TW);
        const ty = Math.max(tip.y - TH - 6, PT);
        return (
          <g pointerEvents="none">
            <line x1={tip.x} y1={tip.y} x2={tip.x} y2={PT + iH} stroke={color} strokeWidth="0.75" strokeDasharray="2 2" opacity="0.4"/>
            <circle cx={tip.x} cy={tip.y} r="3" fill={color}/>
            <rect x={tx} y={ty} width={TW} height={TH} rx="3" fill="#1f2937" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
            <text x={tx + TW / 2} y={ty + 11} textAnchor="middle" fontSize="8" fill="#e5e7eb">
              {tip.minute} · {tip.count} events
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Horizontal bar (top pages) ────────────────────────────────────────────────
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
          const name = pathLabel(d.path);
          const label = name.length > 22 ? name.slice(0, 21) + "…" : name;
          return (
            <g key={i}>
              <text x={PL-6} y={y+13} textAnchor="end" fontSize="9" fill="#9ca3af">{label}</text>
              <rect x={PL} y={y+3} width={bW} height={13} rx="3" fill="#10b981" opacity="0.75"/>
              <text x={PL+bW+4} y={y+13} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Horizontal bar (top referrers) ───────────────────────────────────────────
function truncateRef(ref: string): string {
  return ref.length > 32 ? ref.slice(0, 31) + "…" : ref;
}

export function TopReferrersBar({ data }: { data: Referrer[] }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-600">No referrer data yet</div>;
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
          return (
            <g key={i}>
              <text x={PL-6} y={y+13} textAnchor="end" fontSize="9" fill="#9ca3af">{truncateRef(d.referrer)}</text>
              <rect x={PL} y={y+3} width={bW} height={13} rx="3" fill="#6366f1" opacity="0.75"/>
              <text x={PL+bW+4} y={y+13} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Donut (by type) ───────────────────────────────────────────────────────────
export function TypeDonut({ data }: { data: ByType[] }) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-600">No data yet</div>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const CX = 70, CY = 70, R = 54, r = 30;
  let angle = -Math.PI / 2;
  const slices = data.slice(0, 8).map((d, i) => {
    const frac = d.count / total;
    const a0 = angle, a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const mid = (a0 + a1) / 2, lR = (R + r) / 2;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const xi0 = CX + r * Math.cos(a0), yi0 = CY + r * Math.sin(a0);
    const xi1 = CX + r * Math.cos(a1), yi1 = CY + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    return {
      d: `M${xi0},${yi0} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi0},${yi0} Z`,
      color: P[i % P.length], label: d.type, count: d.count,
      pct: Math.round(frac * 100),
      lx: CX + lR * Math.cos(mid), ly: CY + lR * Math.sin(mid),
    };
  });
  return (
    <svg viewBox="0 0 360 140" className="w-full">
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} opacity="0.85"/>)}
      {slices.map((s, i) => s.pct >= 8 && (
        <text key={i} x={s.lx} y={s.ly + 3.5} textAnchor="middle" fontSize="8.5"
          fill="#fff" fontWeight="700" opacity="0.9" pointerEvents="none">
          {s.pct}%
        </text>
      ))}
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

// ── Funnel chart ──────────────────────────────────────────────────────────────
export function FunnelChart({ data }: { data: Funnel }) {
  const steps = [
    { label: "page_view", value: data.page_view, color: "#6366f1" },
    { label: "tool_open", value: data.tool_open, color: "#10b981" },
    { label: "query_run", value: data.query_run, color: "#f59e0b" },
  ];
  const max = Math.max(steps[0].value, 1);
  const W = 420, BAR_H = 18, GAP = 14, PT = 4;
  const svgH = PT + steps.length * (BAR_H + GAP);
  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full">
      {steps.map((s, i) => {
        const bW = Math.max((s.value / max) * (W - 140), 4);
        const y = PT + i * (BAR_H + GAP);
        const pct = i > 0 && steps[i - 1].value > 0
          ? Math.round((s.value / steps[i - 1].value) * 100) : null;
        return (
          <g key={i}>
            <text x="95" y={y + 13} textAnchor="end" fontSize="9" fill="#9ca3af">{s.label}</text>
            <rect x="100" y={y} width={bW} height={BAR_H} rx="4" fill={s.color} opacity="0.75"/>
            <text x={105 + bW} y={y + 13} fontSize="9" fill="#6b7280">
              {fmt(s.value)}{pct !== null ? `  (${pct}%)` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Tool comparison bar ───────────────────────────────────────────────────────
export function ToolComparisonBar({ data }: { data: TopPage[] }) {
  const tools = data.filter(d => d.path.startsWith("/tools/")).slice(0, 6);
  if (!tools.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-600">No tool data yet</div>;
  const COLORS = ["#10b981","#6366f1","#f59e0b","#ec4899","#8b5cf6","#14b8a6"];
  const max = Math.max(...tools.map(d => d.count), 1);
  const ROW = 24, W = 480, PL = 110, PR = 48, PT = 4;
  const svgH = PT + tools.length * ROW;
  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ height: svgH }} className="w-full">
      {tools.map((d, i) => {
        const y = PT + i * ROW;
        const bW = Math.max((d.count / max) * (W - PL - PR), 4);
        const label = d.path.replace("/tools/", "");
        return (
          <g key={i}>
            <text x={PL - 6} y={y + 15} textAnchor="end" fontSize="9" fill="#9ca3af">{label}</text>
            <rect x={PL} y={y + 4} width={bW} height={15} rx="3" fill={COLORS[i % COLORS.length]} opacity="0.8"/>
            <text x={PL + bW + 5} y={y + 15} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Provider breakdown bar ────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  groq: "#10b981", openai: "#6366f1", anthropic: "#f59e0b",
  cohere: "#ec4899", mistral: "#8b5cf6",
};

export function ProviderBreakdownBar({ data }: { data: ProviderStat[] }) {
  if (!data.length) return <div className="h-10 flex items-center justify-center text-xs text-gray-600">No query data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const ROW = 22, W = 480, PL = 80, PR = 48, PT = 4;
  const svgH = PT + data.length * ROW;
  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ height: svgH }} className="w-full">
      {data.map((d, i) => {
        const y = PT + i * ROW;
        const bW = Math.max((d.count / max) * (W - PL - PR), 4);
        const color = PROVIDER_COLORS[d.provider.toLowerCase()] ?? "#6b7280";
        return (
          <g key={i}>
            <text x={PL - 6} y={y + 13} textAnchor="end" fontSize="9" fill="#9ca3af">{d.provider}</text>
            <rect x={PL} y={y + 3} width={bW} height={13} rx="3" fill={color} opacity="0.8"/>
            <text x={PL + bW + 5} y={y + 13} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Model breakdown bar ───────────────────────────────────────────────────────
const MODEL_COLORS: Record<string, string> = {
  "llama-3.3-70b-versatile": "#10b981",
  "gpt-4o-mini": "#6366f1",
  "claude-haiku-4-5": "#f59e0b",
};

export function ModelBreakdownBar({ data }: { data: ModelStat[] }) {
  if (!data.length) return <div className="h-10 flex items-center justify-center text-xs text-gray-600">No model data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const ROW = 22, W = 480, PL = 130, PR = 48, PT = 4;
  const svgH = PT + data.length * ROW;
  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ height: svgH }} className="w-full">
      {data.map((d, i) => {
        const y = PT + i * ROW;
        const bW = Math.max((d.count / max) * (W - PL - PR), 4);
        const color = MODEL_COLORS[d.model] ?? "#6b7280";
        const label = d.model.length > 20 ? d.model.slice(0, 19) + "…" : d.model;
        return (
          <g key={i}>
            <text x={PL - 6} y={y + 13} textAnchor="end" fontSize="9" fill="#9ca3af">{label}</text>
            <rect x={PL} y={y + 3} width={bW} height={13} rx="3" fill={color} opacity="0.8"/>
            <text x={PL + bW + 5} y={y + 13} fontSize="9" fill="#6b7280">{fmt(d.count)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Geo map (equirectangular, country dots) ───────────────────────────────────
const CENTROIDS: Record<string, [number, number]> = {
  US:[37,-95],IN:[20,78],CN:[35,104],GB:[55,-3],DE:[51,10],FR:[46,2],JP:[36,138],
  BR:[-14,-51],AU:[-25,133],CA:[56,-106],RU:[61,105],KR:[35,127],IT:[41,12],
  ES:[40,-3],MX:[23,-102],ID:[-0,113],NL:[52,5],SA:[23,45],TR:[38,35],PL:[51,19],
  SE:[60,18],SG:[1,103],ZA:[-30,22],PK:[30,69],NG:[9,8],AR:[-38,-63],UA:[48,31],
  BD:[23,90],EG:[26,30],TH:[15,100],VN:[14,108],MY:[4,101],RO:[45,24],CZ:[49,15],
  PT:[39,-8],GR:[39,21],HU:[47,19],AT:[47,14],CH:[46,8],BE:[50,4],FI:[61,25],
  NO:[60,8],DK:[56,9],IL:[31,34],PH:[12,121],NZ:[-40,174],HK:[22,114],TW:[23,120],
  CL:[-35,-71],CO:[4,-74],PE:[-9,-75],VE:[6,-66],
};

export function GeoMap({ data }: { data: Country[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);
  const W = 480, H = 130;
  const toX = (lon: number) => ((lon + 180) / 360) * W;
  const toY = (lat: number) => ((90 - lat) / 180) * H;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setTip(null)}>
      <rect width={W} height={H} fill="#0a0f1e" rx="6"/>
      {[-60,-30,0,30,60].map(lat => (
        <line key={lat} x1={0} y1={toY(lat)} x2={W} y2={toY(lat)} stroke="#ffffff07" strokeWidth="0.5"/>
      ))}
      {[-120,-60,0,60,120].map(lon => (
        <line key={lon} x1={toX(lon)} y1={0} x2={toX(lon)} y2={H} stroke="#ffffff07" strokeWidth="0.5"/>
      ))}
      {data.map(d => {
        const c = CENTROIDS[d.country];
        if (!c) return null;
        const r = 3 + (d.count / max) * 8;
        const cx = toX(c[1]), cy = toY(c[0]);
        return (
          <g key={d.country}
            onMouseEnter={() => setTip({ x: cx, y: cy - r - 4, label: `${d.country} · ${d.count}` })}
            className="cursor-default">
            <circle cx={cx} cy={cy} r={r} fill="#10b981" fillOpacity="0.6" stroke="#10b981" strokeWidth="0.5" strokeOpacity="0.4"/>
            <text x={cx} y={cy - r - 2} textAnchor="middle" fontSize="6" fill="#6b7280">{d.country}</text>
          </g>
        );
      })}
      {data.length === 0 && (
        <text x={W/2} y={H/2} textAnchor="middle" fontSize="10" fill="#374151">No geo data yet</text>
      )}
      {tip && (() => {
        const TW = 70, TH = 16;
        const tx = Math.min(Math.max(tip.x - TW / 2, 2), W - TW - 2);
        const ty = Math.max(tip.y - TH, 2);
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={TW} height={TH} rx="3" fill="#1f2937" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
            <text x={tx + TW / 2} y={ty + 11} textAnchor="middle" fontSize="8" fill="#e5e7eb">{tip.label}</text>
          </g>
        );
      })()}
    </svg>
  );
}