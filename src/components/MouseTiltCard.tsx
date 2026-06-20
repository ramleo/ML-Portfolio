"use client";

import { useRef, useCallback } from "react";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
}

export default function MouseTiltCard({
  children,
  style,
  className,
  maxTilt = 7,
  glowColor = "rgba(255,255,255,0.055)",
  onClick,
  onDrop,
  onDragOver,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY =  (x - 0.5) * maxTilt * 2;
      const rotX = -(y - 0.5) * maxTilt * 2;
      el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.012)`;
      el.style.transition = "transform 0.06s linear";
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.style.setProperty("--go", "1");
    });
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
    el.style.transition = "transform 0.55s cubic-bezier(0.23,1,0.32,1)";
    el.style.setProperty("--go", "0");
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        ...style,
        position: "relative",
        transformStyle: "preserve-3d",
        willChange: "transform",
        overflow: "hidden",
      }}
    >
      {/* Spotlight that follows cursor */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        background: `radial-gradient(circle at var(--gx,50%) var(--gy,50%), ${glowColor}, transparent 62%)`,
        opacity: "var(--go, 0)" as React.CSSProperties["opacity"],
        transition: "opacity 0.35s",
        zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}