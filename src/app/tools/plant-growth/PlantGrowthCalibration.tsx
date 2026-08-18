"use client";

import { useEffect, useRef, useState } from "react";

export type Calibration = { cmPerPixel: number };

/** Click two points on a reference object of known real-world size (a
 * coin, ruler, card) in the first photo, enter that real-world distance,
 * and every measurement downstream can be converted from relative pixel
 * counts to actual cm² — this tool's numbers are otherwise ONLY relative
 * (% change from the first photo), the biggest disclosed limitation across
 * every session that's touched this tool. Entirely a frontend feature: the
 * backend already returns leaf_pixel_count in the same native-pixel-grid
 * units as the uploaded photo, so cm² = leaf_pixel_count * cmPerPixel^2,
 * no new backend model or endpoint needed.
 *
 * Click coordinates are tracked in DISPLAYED image space (easy to draw an
 * SVG overlay in) and converted to the photo's NATIVE pixel space only when
 * computing the final ratio, via naturalWidth/clientWidth captured off the
 * <img> ref — clicking on a scaled-down preview must not silently produce a
 * wrong ratio for the full-resolution photo the backend actually measured. */
export function CalibrationModal({ photoSrc, onSave, onClose }: {
  photoSrc: string; onSave: (c: Calibration) => void; onClose: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [realWorldCm, setRealWorldCm] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setPoints(prev => (prev.length >= 2 ? [point] : [...prev, point]));
  };

  const displayedDistance = points.length === 2
    ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
    : null;

  const canSave = displayedDistance !== null && displayedDistance > 0 && Number(realWorldCm) > 0;

  const save = () => {
    if (!canSave || !imgRef.current || displayedDistance === null) return;
    const scale = imgRef.current.naturalWidth / imgRef.current.clientWidth;
    const nativePixelDistance = displayedDistance * scale;
    onSave({ cmPerPixel: Number(realWorldCm) / nativePixelDistance });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className="flex flex-col gap-3 items-center">
        <div className="relative rounded-xl overflow-hidden" style={{ width: "min(80vw, 520px)", background: "#000" }}>
          <img ref={imgRef} src={photoSrc} alt="Calibration reference" onClick={onImageClick}
            className="w-full block cursor-crosshair" style={{ maxHeight: "60vh", objectFit: "contain" }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#facc15" stroke="#000" strokeWidth={1} />)}
            {points.length === 2 && (
              <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke="#facc15" strokeWidth={2} />
            )}
          </svg>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--text3)", maxWidth: "min(80vw, 420px)" }}>
          Click two points on something in the photo whose real-world size you know (a coin, ruler, card edge)
          — clicking again after two points starts over.
        </p>

        <div className="flex items-center gap-2">
          <input type="number" min={0} step="0.1" value={realWorldCm} onChange={e => setRealWorldCm(e.target.value)}
            placeholder="e.g. 2.4" className="w-24 text-sm rounded-lg px-2 py-1.5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <span className="text-xs" style={{ color: "var(--text3)" }}>cm between those two points</span>
        </div>

        <button onClick={save} disabled={!canSave}
          className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
          style={{ background: "#facc15", color: "#0b0b12", opacity: canSave ? 1 : 0.4 }}>
          Save calibration
        </button>
      </div>
    </div>
  );
}
