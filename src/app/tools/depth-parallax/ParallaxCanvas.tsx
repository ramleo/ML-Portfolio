"use client";

import { useEffect, useRef, useState } from "react";

const GRID_COLS = 40;
const MAX_SHIFT_PX = 18;
// Each tile is drawn slightly oversized so small shift differences between
// neighboring tiles don't leave a hairline gap between them.
const COVER_SCALE = 1.2;
const DISPLAY_MAX_WIDTH = 480;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Grid-tile parallax approximation, not true per-pixel displacement (that
 * would need a WebGL shader) — slices the photo into a GRID_COLS x rows
 * mosaic and offsets each tile by its sampled depth value times the pointer
 * position, so nearer tiles (brighter in the depth map) shift further than
 * farther ones as the pointer moves. Draws an unshifted full-image base
 * layer first, then the shifted tiles on top sorted far-to-near — real
 * testing on a bike photo (thin spokes against a very different-depth
 * background) showed neighboring tiles with a big depth gap tearing apart
 * and exposing bare canvas as jagged black gaps; the base layer plus
 * depth-sorted draw order means a shifted tile's vacated spot always shows
 * the base image underneath, never emptiness. */
export default function ParallaxCanvas({
  imageSrc, depthSrc, width, height,
}: { imageSrc: string; depthSrc: string; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const depthGridRef = useRef<Float32Array | null>(null);
  const drawOrderRef = useRef<Int32Array | null>(null); // tile indices, far-to-near
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  const rows = Math.max(1, Math.round((GRID_COLS * height) / width));
  const dispW = Math.min(DISPLAY_MAX_WIDTH, width);
  const dispH = Math.round((dispW * height) / width);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [img, depthImg] = await Promise.all([loadImage(imageSrc), loadImage(depthSrc)]);
        if (cancelled) return;
        imgRef.current = img;

        const small = document.createElement("canvas");
        small.width = GRID_COLS;
        small.height = rows;
        const sctx = small.getContext("2d");
        if (!sctx) return;
        sctx.drawImage(depthImg, 0, 0, GRID_COLS, rows);
        const data = sctx.getImageData(0, 0, GRID_COLS, rows).data;
        const grid = new Float32Array(GRID_COLS * rows);
        for (let i = 0; i < GRID_COLS * rows; i++) grid[i] = data[i * 4] / 255;
        depthGridRef.current = grid;

        // Draw farthest tiles first, nearest last — nearer tiles shift the
        // most, so painting them on top of the (barely-shifted) far layer
        // means any seam they leave behind is covered by the far layer,
        // never by empty canvas.
        const order = Array.from({ length: grid.length }, (_, i) => i);
        order.sort((a, b) => grid[a] - grid[b]);
        drawOrderRef.current = Int32Array.from(order);

        setReady(true);
      } catch {
        // leave ready=false — the parent shows nothing further, the upload
        // itself already succeeded so this is a rare secondary failure
      }
    })();
    return () => { cancelled = true; };
  }, [imageSrc, depthSrc, rows]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const grid = depthGridRef.current;
    const order = drawOrderRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !grid || !order || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width, ch = canvas.height;
    const tileW = cw / GRID_COLS, tileH = ch / rows;
    const srcTileW = img.naturalWidth / GRID_COLS, srcTileH = img.naturalHeight / rows;

    const draw = () => {
      const { x: px, y: py } = pointerRef.current;
      // Base layer: the whole photo, unshifted — guarantees there's never
      // empty canvas showing through, whatever the shifted tiles above it do.
      ctx.drawImage(img, 0, 0, cw, ch);
      for (const idx of order) {
        const r = Math.floor(idx / GRID_COLS), c = idx % GRID_COLS;
        const depth = grid[idx]; // 0..1, higher = nearer
        const dx = depth * MAX_SHIFT_PX * px * 2;
        const dy = depth * MAX_SHIFT_PX * py * 2 * 0.6;
        const dw = tileW * COVER_SCALE, dh = tileH * COVER_SCALE;
        const dxPos = c * tileW - (dw - tileW) / 2 + dx;
        const dyPos = r * tileH - (dh - tileH) / 2 + dy;
        ctx.drawImage(img, c * srcTileW, r * srcTileH, srcTileW, srcTileH, dxPos, dyPos, dw, dh);
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => { draw(); rafRef.current = null; });
      }
    };
    const onLeave = () => { pointerRef.current = { x: 0, y: 0 }; draw(); };

    draw();
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);
    return () => {
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, rows]);

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden mx-auto"
      style={{ width: dispW, height: dispH, background: "#0a0f1a", touchAction: "none" }}>
      <canvas ref={canvasRef} width={dispW} height={dispH} style={{ width: "100%", height: "100%" }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "var(--text3)" }}>
          Loading…
        </div>
      )}
    </div>
  );
}
