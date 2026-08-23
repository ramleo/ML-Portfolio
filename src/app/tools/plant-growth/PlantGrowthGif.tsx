"use client";

import { useState } from "react";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const ERROR_COLOR = "#f87171";
const GIF_MAX_SIZE = 480;
const GIF_FRAME_DELAY_MS = 700;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load image"));
    img.src = src;
  });
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds an animated GIF from a photo sequence, entirely client-side — no
 * backend, no upload. Each photo is letterboxed (contain-fit, centered) onto
 * a fixed square canvas so differently-sized/oriented photos don't distort
 * or crop, then quantized to its own 256-color palette per frame (gifenc,
 * pure JS, no worker) — simpler than a shared palette across frames and the
 * per-frame quality difference is not noticeable at this photo count.
 *
 * `frameAlignment` (optional, index-aligned to `photoSrcs`): a [dx, dy] per
 * photo, in that photo's own original-pixel units, from the backend's
 * phase-correlation check (mm_plant_growth_align.py) — corrects for camera
 * shake between shots so the exported sequence doesn't visibly jump. Only
 * ever available after the user has run a growth-mode measurement; absent
 * (or shorter than `photoSrcs`) just draws that frame at its normal
 * centered position, same as before this existed. */
export async function buildTimelapseGif(photoSrcs: string[], frameAlignment?: [number, number][]): Promise<Blob> {
  const images = await Promise.all(photoSrcs.map(loadImage));
  const canvas = document.createElement("canvas");
  canvas.width = GIF_MAX_SIZE;
  canvas.height = GIF_MAX_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const gif = GIFEncoder();

  images.forEach((img, i) => {
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, GIF_MAX_SIZE, GIF_MAX_SIZE);
    const scale = Math.min(GIF_MAX_SIZE / img.width, GIF_MAX_SIZE / img.height);
    const w = img.width * scale, h = img.height * scale;
    // Subtract the offset (scaled into this canvas's pixel units) to move
    // the frame's content back toward the reference frame's position — see
    // compute_frame_alignment's docstring for the sign convention.
    const [dx, dy] = frameAlignment?.[i] ?? [0, 0];
    const drawX = (GIF_MAX_SIZE - w) / 2 - dx * scale;
    const drawY = (GIF_MAX_SIZE - h) / 2 - dy * scale;
    ctx.drawImage(img, drawX, drawY, w, h);
    const { data } = ctx.getImageData(0, 0, GIF_MAX_SIZE, GIF_MAX_SIZE);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, GIF_MAX_SIZE, GIF_MAX_SIZE, { palette, delay: GIF_FRAME_DELAY_MS });
  });
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

export function GifExportButton({ photoSrcs, filename, frameAlignment }: { photoSrcs: string[]; filename: string; frameAlignment?: [number, number][] }) {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (photoSrcs.length < 2) return null;

  const onClick = async () => {
    setBuilding(true);
    setError(null);
    try {
      const blob = await buildTimelapseGif(photoSrcs, frameAlignment);
      downloadBlob(filename, blob);
    } catch {
      setError("Could not build the GIF — try again.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onClick} disabled={building}
        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border"
        style={{ borderColor: "var(--border)", color: "var(--text3)", opacity: building ? 0.5 : 1 }}>
        {building ? "Building GIF…" : "Export time-lapse GIF"}
      </button>
      {error && <span className="text-[10px]" style={{ color: ERROR_COLOR }}>{error}</span>}
    </div>
  );
}
