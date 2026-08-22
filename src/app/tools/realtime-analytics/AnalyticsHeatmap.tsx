"use client";

import { useState } from "react";

interface HeatCell { day: number; hour: number; count: number; }
interface Props { data: HeatCell[]; }

const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function AnalyticsHeatmap({ data }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null);

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const { day, hour, count } of data) grid[day][hour] = count;
  const max = Math.max(...data.map(d => d.count), 1);

  const CELL = 17, GAP = 2, LEFT = 30, TOP = 18;
  const W = LEFT + 24 * (CELL + GAP);
  const H = TOP + 7 * (CELL + GAP);

  if (data.length === 0) return (
    <div className="h-20 flex items-center justify-center text-xs text-[var(--text3)]">No data yet</div>
  );

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full"
        onMouseLeave={() => setTip(null)}>
        {Array.from({ length: 24 }, (_, h) => h % 3 === 0 && (
          <text key={h}
            x={LEFT + h * (CELL + GAP) + CELL / 2} y={12}
            textAnchor="middle" fontSize="7" fill="var(--text3)">
            {h}h
          </text>
        ))}
        {DAY_LABELS.map((label, d) => (
          <g key={d}>
            <text x={LEFT - 4} y={TOP + d * (CELL + GAP) + CELL / 2 + 3}
              textAnchor="end" fontSize="7" fill="var(--text3)">{label}</text>
            {Array.from({ length: 24 }, (_, h) => {
              const count = grid[d][h];
              const intensity = count === 0 ? 0 : 0.15 + (count / max) * 0.75;
              const cx = LEFT + h * (CELL + GAP) + CELL / 2;
              const cy = TOP + d * (CELL + GAP) + CELL / 2;
              return (
                <rect key={h}
                  x={LEFT + h * (CELL + GAP)} y={TOP + d * (CELL + GAP)}
                  width={CELL} height={CELL} rx="2"
                  fill="#10b981" fillOpacity={count === 0 ? 0.05 : intensity}
                  className="cursor-default"
                  onMouseEnter={() => setTip({ x: cx, y: cy - CELL, label: `${DAY_LABELS[d]} ${h}:00 — ${count} event${count !== 1 ? "s" : ""}` })}
                />
              );
            })}
          </g>
        ))}
        {/* SVG tooltip */}
        {tip && (() => {
          const TW = 110, TH = 16;
          const tx = Math.min(tip.x - TW / 2, W - TW - 2);
          const ty = Math.max(tip.y - TH - 4, 2);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={TW} height={TH} rx="3"
                fill="var(--bg-card)" stroke="var(--border2)" strokeWidth="0.5"/>
              <text x={tx + TW / 2} y={ty + 11} textAnchor="middle" fontSize="8" fill="var(--text)">
                {tip.label}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}