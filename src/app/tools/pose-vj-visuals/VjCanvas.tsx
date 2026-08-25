"use client";

import { useEffect, useRef } from "react";
import type { HandLandmarks } from "./usePoseTracking";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number };

// Fingertip + wrist landmarks (MediaPipe's 21-point hand model) — enough
// spawn points to read as "the whole hand," not just one dot per hand.
const SPAWN_LANDMARKS = [0, 4, 8, 12, 16, 20];

type Props = {
  hands: HandLandmarks[];
  amplitude: number; // 0-1, from useMicAudio; 0 when mic isn't active
  hue: number; // 0-360, base palette hue
  density: number; // 0.2-2, particle-count multiplier
  width: number;
  height: number;
};

/** Owns its own particle array + physics + draw loop, independent of
 * React's render cycle (mutating a ref, not state, every animation frame —
 * particle counts get into the hundreds, well past what's sensible to
 * push through React state updates 60x/second). `hands`/`amplitude` are
 * read fresh each frame via refs so the loop always sees the latest
 * values without restarting the effect on every landmark update. */
export default function VjCanvas({ hands, amplitude, hue, density, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const prevPointsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const latestRef = useRef({ hands, amplitude, hue, density });
  latestRef.current = { hands, amplitude, hue, density };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf: number;

    const step = () => {
      const { hands: liveHands, amplitude: amp, hue: baseHue, density: dens } = latestRef.current;

      // Trail fade: a translucent rect over the previous frame, not a full
      // clear — this is what gives motion a trailing streak instead of
      // discrete blips.
      ctx.fillStyle = "rgba(8, 8, 14, 0.18)";
      ctx.fillRect(0, 0, width, height);

      const seenKeys = new Set<string>();
      liveHands.forEach((points, handIdx) => {
        for (const li of SPAWN_LANDMARKS) {
          const p = points[li];
          if (!p) continue;
          // Mirror x to match a front-camera "selfie" sense of left/right.
          const x = (1 - p.x) * width;
          const y = p.y * height;
          const key = `${handIdx}:${li}`;
          seenKeys.add(key);
          const prev = prevPointsRef.current.get(key);
          const vx = prev ? (x - prev.x) * 0.4 : 0;
          const vy = prev ? (y - prev.y) * 0.4 : 0;
          prevPointsRef.current.set(key, { x, y });

          const speed = Math.hypot(vx, vy);
          const spawnCount = Math.round((1 + speed * 0.3 + amp * 6) * dens);
          for (let i = 0; i < spawnCount; i++) {
            particlesRef.current.push({
              x, y,
              vx: vx * 0.5 + (Math.random() - 0.5) * 2,
              vy: vy * 0.5 + (Math.random() - 0.5) * 2,
              life: 0,
              maxLife: 40 + Math.random() * 40,
              size: 1.5 + Math.random() * 2 + amp * 4,
              hue: (baseHue + Math.random() * 40 - 20 + 360) % 360,
            });
          }
        }
      });
      // Drop stale tracked points for hands/landmarks no longer detected,
      // so a hand re-entering frame doesn't get a huge fake velocity spike
      // from a stale previous position.
      for (const key of prevPointsRef.current.keys()) {
        if (!seenKeys.has(key)) prevPointsRef.current.delete(key);
      }

      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        const t = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${t})`;
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
        alive.push(p);
      }
      // Hard cap so a very fast/loud session can't grow this unbounded.
      particlesRef.current = alive.length > 4000 ? alive.slice(alive.length - 4000) : alive;

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="rounded-lg w-full" style={{ background: "#08080e", aspectRatio: `${width} / ${height}` }} />;
}
