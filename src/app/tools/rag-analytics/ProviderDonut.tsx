"use client";

import { useState } from "react";
import EmptyState from "./EmptyState";

const PALETTE = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#f87171", "#f472b6", "#60a5fa"];

export default function ProviderDonut({ data, size = 160 }: { data: Record<string, number>; size?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (entries.length === 0 || total === 0) return <EmptyState label="No provider-served answers yet" />;

  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={14} />
          {entries.map(([name, count], i) => {
            const frac = count / total;
            const dash = frac * circumference;
            const dashoffset = -offsetAcc;
            offsetAcc += dash;
            const color = PALETTE[i % PALETTE.length];
            const isHovered = hover === name;
            return (
              <circle key={name} cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={color} strokeWidth={isHovered ? 17 : 14}
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={dashoffset}
                style={{
                  transition: "stroke-width 0.15s ease, opacity 0.15s ease",
                  opacity: hover && !isHovered ? 0.35 : 1, cursor: "pointer",
                }}
                onMouseEnter={() => setHover(name)} onMouseLeave={() => setHover(null)} />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold" style={{ color: "var(--text)" }}>{hover ? data[hover] : total}</span>
          <span className="text-[9px] truncate max-w-[70%]" style={{ color: "var(--text3)" }}>
            {hover ?? "total"}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        {entries.map(([name, count], i) => {
          const color = PALETTE[i % PALETTE.length];
          const pct = Math.round((count / total) * 100);
          return (
            <div key={name} className="flex items-center gap-2 text-[11px] cursor-pointer"
              onMouseEnter={() => setHover(name)} onMouseLeave={() => setHover(null)}
              style={{ opacity: hover && hover !== name ? 0.5 : 1 }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span style={{ color: "var(--text2)" }}>{name}</span>
              <span style={{ color: "var(--text3)" }}>{count} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}