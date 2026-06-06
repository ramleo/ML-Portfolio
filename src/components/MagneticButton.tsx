"use client";

import { useRef, ReactNode } from "react";

interface Props {
  children: ReactNode;
  strength?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function MagneticButton({ children, strength = 0.35, style, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
    el.style.transition = "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
  };

  const onEnter = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.15s ease";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={onEnter}
      style={{ display: "inline-block", ...style }}
      className={className}
    >
      {children}
    </div>
  );
}
