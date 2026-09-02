"use client";
import { useRef, useEffect } from "react";
import { useMousePos } from "./MouseRepulsionProvider";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  strength?: number; // default 18 (px max push)
  radius?: number;   // default 180 (px activation radius)
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  /** Guided-demo anchor. Declared rather than spread: this component takes no
   *  rest props, so an inline data-wt on a RepulsionCard would be dropped
   *  silently and the spotlight would have nothing to find. */
  "data-wt"?: string;
}

export default function RepulsionCard({
  children, style, className, strength = 18, radius = 180,
  onClick, onDrop, onDragOver, "data-wt": dataWt,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mousePos = useMousePos();
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !mousePos) return;

    const tick = () => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const { x, y } = mousePos.current;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius && dist > 0) {
        const force = (1 - dist / radius) * strength;
        const nx = (dx / dist) * force;
        const ny = (dy / dist) * force;
        el.style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px)`;
        el.style.transition = "transform 0.12s linear";
      } else {
        el.style.transform = "translate(0px, 0px)";
        el.style.transition = "transform 0.5s cubic-bezier(0.23,1,0.32,1)";
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mousePos, strength, radius]);

  return (
    <div
      ref={cardRef}
      data-wt={dataWt}
      className={className}
      style={{ ...style, willChange: "transform" }}
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {children}
    </div>
  );
}
