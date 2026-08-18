"use client";

import { useEffect, useState } from "react";

/** Blends two pending photos with an opacity slider so a user can check
 * framing consistency BEFORE measuring — growth% only means anything if
 * every photo is shot from the same angle/distance/position, and this
 * tool has no live camera preview to guide shooting (it only accepts
 * already-taken files), so the check has to happen after the fact instead
 * of via a live ghost-overlay viewfinder like a dedicated timelapse app
 * would use. If the pot, background, or plant edges visibly shift while
 * dragging the slider, these two photos aren't framed the same way. */
export function FramingCheck({ baseline, compare, compareLabel, onClose }: {
  baseline: string; compare: string; compareLabel: string; onClose: () => void;
}) {
  const [opacity, setOpacity] = useState(50);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} className="flex flex-col gap-3 items-center">
        <div className="relative rounded-xl overflow-hidden" style={{ width: "min(80vw, 520px)", height: "min(60vh, 520px)", background: "#000" }}>
          <img src={baseline} alt="Day 0" className="absolute inset-0 w-full h-full" style={{ objectFit: "contain" }} />
          <img src={compare} alt={compareLabel} className="absolute inset-0 w-full h-full" style={{ objectFit: "contain", opacity: opacity / 100 }} />
        </div>
        <div className="flex items-center gap-3 w-full" style={{ maxWidth: "min(80vw, 520px)" }}>
          <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>Day 0</span>
          <input type="range" min={0} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="flex-1" />
          <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>{compareLabel}</span>
        </div>
        <p className="text-xs text-center" style={{ color: "var(--text3)", maxWidth: "min(80vw, 420px)" }}>
          Drag the slider to blend between the two photos. If the pot, background, or plant edges shift as
          you drag, these photos aren&apos;t framed the same way — growth% between them will partly reflect
          the camera moving, not the plant.
        </p>
      </div>
    </div>
  );
}
