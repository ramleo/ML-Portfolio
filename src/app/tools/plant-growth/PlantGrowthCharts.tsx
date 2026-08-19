"use client";

import type { GrowthFrame, PlantComparison } from "./usePlantGrowthRunner";

export const WARN_COLOR = "#facc15";

// Shared classes for result thumbnails that open a Lightbox on click — a
// subtle hover scale signals they're interactive without a full expand.
export const ZOOMABLE_THUMB_CLASS = "rounded-lg object-cover shrink-0 cursor-zoom-in transition-transform duration-150 hover:scale-110";

/** Hover/title text for a mask-preview thumbnail, surfacing the two
 * secondary metrics (mm_plant_growth_metrics.py) without cluttering the
 * visible layout — greenness_index has no intuitive unit for a casual
 * user, and leaf_count's undercount-on-overlap caveat is too long for
 * always-visible text. */
export function metricsTooltip(f: { greennessIndex: number; leafCount: number }): string {
  return `Greenness index: ${f.greennessIndex} (RGB vegetation index, higher = more vividly green/healthy foliage)\n` +
    `${f.leafCount} leaf blob${f.leafCount === 1 ? "" : "s"} detected (may undercount leaves that overlap or touch)`;
}

/** Hand-rolled SVG growth curve — no charting library in this repo, this
 * mirrors realtime-analytics/AnalyticsCharts.tsx's Sparkline pattern
 * (area+line path from computed points, gradient fill, axis labels). */
export function GrowthChart({ frames, accent, projectedPct }: { frames: GrowthFrame[]; accent: string; projectedPct?: number | null }) {
  const W = 640, H = 200, PL = 40, PR = 12, PT = 26, PB = 24;
  const iW = W - PL - PR, iH = H - PT - PB;
  const hasProjection = projectedPct !== undefined && projectedPct !== null;
  const values = frames.map(f => f.growthPct);
  if (hasProjection) values.push(projectedPct);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  // Leave room for the projected point one step past the last real frame —
  // denom only grows when a projection is shown, so the chart is pixel-
  // identical to before when it's not.
  const denom = Math.max(frames.length - 1 + (hasProjection ? 1 : 0), 1);
  const pts = frames.map((f, i) => ({
    x: PL + (i / denom) * iW,
    y: PT + (1 - (f.growthPct - min) / range) * iH,
    ...f,
  }));
  const projPt = hasProjection ? {
    x: PL + (frames.length / denom) * iW,
    y: PT + (1 - (projectedPct - min) / range) * iH,
  } : null;
  const zeroY = PT + (1 - (0 - min) / range) * iH;
  const area = `M${pts[0].x},${zeroY} L${pts.map(p => `${p.x},${p.y}`).join(" L")} L${pts[pts.length - 1].x},${zeroY} Z`;
  const line = `M${pts.map(p => `${p.x},${p.y}`).join(" L")}`;
  const gid = "plant-growth-fill";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PL} y1={zeroY} x2={PL + iW} y2={zeroY} stroke="#ffffff1a" strokeWidth="1" strokeDasharray="3,3" />
      <text x={PL - 6} y={zeroY + 3} textAnchor="end" fontSize="9" fill="var(--text3)">0%</text>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {projPt && (
        <>
          <line x1={pts[pts.length - 1].x} y1={pts[pts.length - 1].y} x2={projPt.x} y2={projPt.y}
            stroke={accent} strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round" opacity={0.6} />
          <circle cx={projPt.x} cy={projPt.y} r={3.5} fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="2,2" />
          <text x={projPt.x} y={H - 4} textAnchor="end" fontSize="8" fill="var(--text3)">projected</text>
          <text x={projPt.x} y={projPt.y - 8} textAnchor="end" fontSize="9" fontWeight={600} fill={accent} opacity={0.8}>
            {projectedPct! > 0 ? "+" : ""}{projectedPct}%
          </text>
        </>
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.lowConfidence ? 3 : 3.5}
          fill={p.lowConfidence ? WARN_COLOR : accent}
          stroke={p.lowConfidence ? WARN_COLOR : "none"} />
      ))}
      {pts.map((p, i) => {
        const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
        return (
          <text key={`label-${i}`} x={p.x} y={H - 4} textAnchor={anchor} fontSize="8" fill="var(--text3)">
            {p.label.length > 8 ? p.label.slice(0, 7) + "…" : p.label}
          </text>
        );
      })}
      {pts.map((p, i) => {
        const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
        return (
          <text key={`val-${i}`} x={p.x} y={p.y - 8} textAnchor={anchor} fontSize="9" fontWeight={600} fill="var(--text)">
            {p.growthPct > 0 ? "+" : ""}{p.growthPct}%
          </text>
        );
      })}
    </svg>
  );
}

/** Growth-mode thumbnail strip: mask preview + label + growth% + leaf
 * count, shared by the main growth view and the compare-mode "growth
 * stages" reinterpretation. */
export function FrameThumbnails({ frames, accent, onImageClick, cmPerPixel }: {
  frames: GrowthFrame[]; accent: string; onImageClick: (src: string, alt: string) => void; cmPerPixel?: number;
}) {
  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {frames.map((f, i) => (
        <div key={i} className="flex flex-col gap-1 items-center">
          {f.maskPreviewUrl && (
            <img src={f.maskPreviewUrl} alt={`${f.label} leaf mask`} title={metricsTooltip(f)} className={ZOOMABLE_THUMB_CLASS}
              onClick={() => onImageClick(f.maskPreviewUrl!, `${f.label} leaf mask`)}
              style={{ width: 100, height: 100, outline: f.lowConfidence ? `2px solid ${WARN_COLOR}` : "none" }} />
          )}
          <span className="text-[10px]" style={{ color: "var(--text3)" }}>{f.label}</span>
          <span className="text-[10px] font-semibold" style={{ color: f.lowConfidence ? WARN_COLOR : accent }}>
            {f.growthPct > 0 ? "+" : ""}{f.growthPct}%
          </span>
          <span className="text-[9px]" style={{ color: "var(--text3)" }}>{f.leafCount} {f.leafCount === 1 ? "leaf" : "leaves"}</span>
          {cmPerPixel && (
            <span className="text-[9px]" style={{ color: "var(--text3)" }}>
              ~{(f.leafPixelCount * cmPerPixel * cmPerPixel).toFixed(1)} cm²
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Single photo, multiple plants — ranks them by current leaf area
 * relative to the largest (100%), no time axis. Horizontal bars instead of
 * GrowthChart's line/points since there's no x-axis of days to plot. */
export function CompareView({ plants, accent, onImageClick, cmPerPixel }: {
  plants: PlantComparison[]; accent: string; onImageClick: (src: string, alt: string) => void; cmPerPixel?: number;
}) {
  const sorted = [...plants].sort((a, b) => b.relativePct - a.relativePct);
  return (
    <div className="flex flex-col gap-3">
      {sorted.map(p => (
        <div key={p.index} className="flex items-center gap-3">
          {p.maskPreviewUrl && (
            <img src={p.maskPreviewUrl} alt={`Plant ${p.index + 1} leaf mask`} title={metricsTooltip(p)} className={ZOOMABLE_THUMB_CLASS}
              onClick={() => onImageClick(p.maskPreviewUrl!, `Plant ${p.index + 1} leaf mask`)}
              style={{ width: 56, height: 56, outline: p.lowConfidence ? `2px solid ${WARN_COLOR}` : "none" }} />
          )}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text3)" }}>
                Plant {p.index + 1} <span style={{ color: "var(--text3)", opacity: 0.7 }}>· {p.leafCount} {p.leafCount === 1 ? "leaf" : "leaves"}</span>
                {cmPerPixel && (
                  <span style={{ color: "var(--text3)", opacity: 0.7 }}> · ~{(p.leafPixelCount * cmPerPixel * cmPerPixel).toFixed(1)} cm²</span>
                )}
              </span>
              <span className="font-semibold" style={{ color: p.lowConfidence ? WARN_COLOR : accent }}>
                {p.relativePct}%
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: `${p.relativePct}%`, background: p.lowConfidence ? WARN_COLOR : accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
