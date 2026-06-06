"use client";

import { useRef, useEffect } from "react";

export default function ParticleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = document.documentElement.scrollHeight;
    canvas.width = W;
    canvas.height = H;

    const GAP = 38;
    const RADIUS = 1.8;
    const MAX_DIST = 110;

    type Dot = { x: number; y: number; ox: number; oy: number; vx: number; vy: number };
    let dots: Dot[] = [];

    const build = () => {
      W = window.innerWidth;
      H = document.documentElement.scrollHeight;
      canvas.width = W;
      canvas.height = H;
      dots = [];
      for (let x = GAP; x < W; x += GAP) {
        for (let y = GAP; y < H; y += GAP) {
          dots.push({ x, y, ox: x, oy: y, vx: 0, vy: 0 });
        }
      }
    };
    build();

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const isDark = document.documentElement.getAttribute("data-theme") !== "light";
      const dotColor = isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.2)";
      const lineColor = isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)";

      for (const d of dots) {
        const dx = mouse.current.x - d.ox;
        const dy = mouse.current.y - d.oy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DIST) {
          const force = (MAX_DIST - dist) / MAX_DIST;
          const angle = Math.atan2(dy, dx);
          const push = force * 28;
          d.vx += -Math.cos(angle) * push * 0.08;
          d.vy += -Math.sin(angle) * push * 0.08;
        }

        d.vx += (d.ox - d.x) * 0.06;
        d.vy += (d.oy - d.y) * 0.06;
        d.vx *= 0.78;
        d.vy *= 0.78;
        d.x += d.vx;
        d.y += d.vy;

        ctx.beginPath();
        ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < GAP * 1.5) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    tick();

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY + window.scrollY };
    };
    const onResize = () => build();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 1,
      }}
    />
  );
}
