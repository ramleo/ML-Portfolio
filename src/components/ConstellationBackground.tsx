"use client";

import { useEffect, useRef } from "react";

const N = 70;
const MAX_DIST = 130;
const REPEL_RADIUS = 120;
const REPEL_PUSH = 28;
const SPRING = 0.05;
const DAMPING = 0.80;

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    // WCAG 2.2 (2.3.3): honour a reduced-motion preference. When set, we draw a
    // single static frame — the constellation still shows, but nothing moves and
    // the cursor-repel is off — instead of running the rAF loop.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: -9999, y: -9999 };

    // Each dot has a fixed origin it springs back to
    const pts = Array.from({ length: N }, () => {
      const ox = Math.random() * W;
      const oy = Math.random() * H;
      return { x: ox, y: oy, ox, oy, vx: 0, vy: 0, r: Math.random() * 1.2 + 0.5 };
    });

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    if (!reduce) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseleave", onMouseLeave);
    }

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      // Reposition origins proportionally
      for (const p of pts) {
        p.ox = Math.random() * W; p.oy = Math.random() * H;
        p.x = p.ox; p.y = p.oy; p.vx = 0; p.vy = 0;
      }
      if (reduce) draw();   // no rAF loop to repaint after a resize
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const isLight = document.documentElement.classList.contains("light");

      for (const p of pts) {
        const dx = mouse.x - p.ox;
        const dy = mouse.y - p.oy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Repel away from cursor
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const angle = Math.atan2(dy, dx);
          p.vx += -Math.cos(angle) * force * REPEL_PUSH * 0.08;
          p.vy += -Math.sin(angle) * force * REPEL_PUSH * 0.08;
        }

        // Spring back to origin
        p.vx += (p.ox - p.x) * SPRING;
        p.vy += (p.oy - p.y) * SPRING;

        // Damping
        p.vx *= DAMPING;
        p.vy *= DAMPING;

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? "rgba(56,132,190,0.30)" : "rgba(34,211,238,0.55)"; ctx.fill();
      }

      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            // Light mode keeps a fainter line: over the pale ground blue lines
            // darken the composite behind text, so muted text/links can drop
            // below the 4.5:1 WCAG floor where a line (or several, stacked)
            // crosses them. 0.11 keeps the constellation visible while leaving
            // the darkened-line composite light enough for --text3 (#4d5a6d).
            const lineAlpha = (isLight ? 0.11 : 0.13) * (1 - d / MAX_DIST);
            ctx.strokeStyle = isLight ? `rgba(56,132,190,${lineAlpha})` : `rgba(34,211,238,${lineAlpha})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }

      if (!reduce) animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <>
      <style>{`body { background: var(--bg); }`}</style>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }} />
    </>
  );
}