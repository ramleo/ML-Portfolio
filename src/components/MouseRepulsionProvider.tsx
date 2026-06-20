"use client";
import { createContext, useContext, useEffect, useRef } from "react";

const Ctx = createContext<React.MutableRefObject<{ x: number; y: number }> | null>(null);

export function MouseRepulsionProvider({ children }: { children: React.ReactNode }) {
  const pos = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return <Ctx.Provider value={pos}>{children}</Ctx.Provider>;
}

export function useMousePos() {
  return useContext(Ctx);
}