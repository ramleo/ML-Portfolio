"use client";

import { useRef, useState } from "react";
import type { Bbox } from "./_types";

const MIN_POINTS = 3;
// Normalized (0-1) — drop a new point if it's closer to the last one than
// this, so a slow long drag doesn't balloon the polygon payload. The
// backend polygon-fill only needs enough points to approximate the shape,
// not every raw pointer sample.
const MIN_STEP = 0.015;
const MIN_SIZE = 0.01; // ignore an accidental click/tiny drag, not a real region

type Props = {
  onComplete: (bbox: Bbox, mask: [number, number][]) => void;
};

/** Transparent pointer-capture layer for "draw your own region to remove" —
 * rendered as the LAST sibling inside the citation image's relative
 * wrapper, only while draw mode is on (CitationThumbnailPanel toggles it).
 * Being last means it paints on top and naturally intercepts every pointer
 * event over the image while active, including over the existing detected-
 * box ✕ buttons underneath — no separate code needed to disable them.
 *
 * Produces exactly the same (bbox, mask) shape a detected region's own ✕
 * button already passes to useInpaint's run() — the backend's polygon-fill
 * (mm_inpaint.py) doesn't care whether a mask came from SAM or a mouse
 * drag, so this needed no backend change, only a way to draw the polygon. */
export default function FreehandDrawLayer({ onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const [points, setPoints] = useState<[number, number][]>([]);

  const toPoint = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    setPoints([toPoint(e)]);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = toPoint(e);
    setPoints(prev => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_STEP) return prev;
      return [...prev, p];
    });
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (points.length >= MIN_POINTS) {
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      const bbox: Bbox = [minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY];
      if (bbox[2] > MIN_SIZE && bbox[3] > MIN_SIZE) onComplete(bbox, points);
    }
    setPoints([]);
  };

  return (
    <div ref={ref} className="absolute inset-0" style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}>
      {points.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={points.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
            fill="none" stroke="#a78bfa" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}