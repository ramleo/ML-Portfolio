"use client";

import { useEffect, useRef, useState } from "react";

/** Measures an element so SVG charts can draw at real pixel size — keeping text
 * at its literal size and marks undistorted (no preserveAspectRatio stretch).
 * Returns the ref to attach and the current content-box width/height. */
export function useMeasure<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T | null>, number, number] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize((s) => (Math.abs(s.w - r.width) > 0.5 || Math.abs(s.h - r.height) > 0.5 ? { w: r.width, h: r.height } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size.w, size.h];
}
