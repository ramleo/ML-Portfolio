"use client";

import type { GrowthFrame } from "./usePlantGrowthRunner";

/** Linear extrapolation of the existing growth curve — NOT a real forecast.
 * Assumes the average per-photo growth rate (last frame's growth% divided
 * evenly across the steps taken to reach it) holds steady, and that every
 * future photo is framed the same way as the ones already measured. Real
 * plant growth is rarely linear (slows as a plant matures, accelerates then
 * plateaus, etc.) — this is a rough "if nothing changes" projection, same
 * honesty framing as the tool's other assumption-based features. */
export function projectGrowth(frames: GrowthFrame[], stepsAhead: number): number | null {
  if (frames.length < 2 || stepsAhead <= 0) return null;
  const last = frames[frames.length - 1].growthPct;
  const ratePerStep = last / (frames.length - 1);
  return Math.round((last + ratePerStep * stepsAhead) * 10) / 10;
}

export function ProjectionControl({ frames, stepsAhead, onStepsAheadChange, projectedPct, accent }: {
  frames: GrowthFrame[];
  stepsAhead: number;
  onStepsAheadChange: (n: number) => void;
  projectedPct: number | null;
  accent: string;
}) {
  if (frames.length < 2) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: "var(--text3)" }}>
      <span>Project</span>
      <input type="number" min={1} max={30} value={stepsAhead}
        onChange={e => onStepsAheadChange(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
        className="w-12 rounded px-1 py-0.5 text-center"
        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }} />
      <span>more photo{stepsAhead === 1 ? "" : "s"} ahead at the same average rate:</span>
      {projectedPct !== null && (
        <span className="font-semibold" style={{ color: accent }}>
          {projectedPct > 0 ? "+" : ""}{projectedPct}%
        </span>
      )}
      <span className="w-full text-[10px]" style={{ color: "var(--text3)", opacity: 0.7 }}>
        Assumes steady, linear growth and identical framing — a rough extrapolation, not a forecast.
      </span>
    </div>
  );
}
