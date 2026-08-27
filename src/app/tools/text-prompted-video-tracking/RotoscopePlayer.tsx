"use client";

import { useEffect, useRef, useState } from "react";

/** Plays a fixed array of already-decoded JPEG frames as a simple canvas
 * flipbook — no video encoding on the backend, so this IS the "video"
 * (a sampled-frame preview, not a full-resolution/full-framerate export;
 * disclosed in the tool's own copy). */
export default function RotoscopePlayer({ frames, fps, accent }: { frames: string[]; fps: number; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const imgs = frames.map(f => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${f}`;
      return img;
    });
    Promise.all(imgs.map(img => new Promise<void>(resolve => {
      if (img.complete) resolve();
      else img.onload = () => resolve();
    }))).then(() => { if (!cancelled) { imagesRef.current = imgs; setLoaded(true); } });
    return () => { cancelled = true; };
  }, [frames]);

  useEffect(() => {
    if (!loaded || !playing) return;
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [loaded, playing, fps, frames.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
  }, [index, loaded]);

  if (!loaded) {
    return <div className="text-sm" style={{ color: "var(--text3)" }}>Decoding frames…</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={canvasRef} className="rounded-lg w-full" style={{ background: "#000" }} />
      <div className="flex items-center gap-3">
        <button onClick={() => setPlaying(p => !p)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: accent, color: "#fff" }}>
          {playing ? "Pause" : "Play"}
        </button>
        <input type="range" min={0} max={frames.length - 1} value={index}
          onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }}
          className="flex-1" />
        <span className="text-[10px] tabular-nums" style={{ color: "var(--text3)" }}>
          {index + 1} / {frames.length}
        </span>
      </div>
    </div>
  );
}
