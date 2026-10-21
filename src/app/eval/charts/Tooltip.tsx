"use client";

import { useState, type ReactNode } from "react";

/** A cursor-following tooltip shared by every chart. Enhances — never gates: every
 * value a tooltip shows is also on an axis, a direct label, or the table view. */
export function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; node: ReactNode } | null>(null);
  const move = (e: { clientX: number; clientY: number }, node: ReactNode) => setTip({ x: e.clientX, y: e.clientY, node });
  const leave = () => setTip(null);
  const Tip = tip ? (
    <div
      style={{
        position: "fixed", left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 230),
        top: tip.y + 16, zIndex: 200, pointerEvents: "none",
        background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)", padding: "8px 11px", maxWidth: 220,
        fontSize: 12, lineHeight: 1.5, color: "var(--text2)",
      }}
    >
      {tip.node}
    </div>
  ) : null;
  return { move, leave, Tip };
}

/** A line in a tooltip: colored swatch + label on the left, value on the right. */
export function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {color && <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />}
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </span>
      <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</strong>
    </div>
  );
}
