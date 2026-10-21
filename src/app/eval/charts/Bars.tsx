"use client";

import { type ReactNode, type CSSProperties } from "react";
import { useTip } from "./Tooltip";

/** Row-fill horizontal bars — the site's approved pattern (Plausible/Vercel style,
 * matching realtime-analytics RowBars): the row itself IS the bar, a tinted fill
 * riding under the label (left) and value (right) on a full-width rounded track.
 * Stacked segments (ok/error, up/down) sit inside the one fill. Hover tooltip and
 * optional click-to-drill. One series = one hue (never a value-ramp). */

export interface Seg { value: number; color: string; label?: string }
export interface BarDatum {
  key: string; label: string; segs: Seg[]; max: number;
  value: ReactNode; valueColor?: string; onClick?: () => void; tip?: ReactNode;
}

const tint = (c: string) => `color-mix(in srgb, ${c} 34%, transparent)`;

export function BarRow({ d, onMove, onLeave }:
  { d: BarDatum; onMove?: (e: React.MouseEvent) => void; onLeave?: () => void }) {
  const total = d.segs.reduce((a, s) => a + s.value, 0);
  const fillPct = total > 0 ? Math.max((total / Math.max(1e-9, d.max)) * 100, 2.5) : 0;
  const inner = (
    <>
      <span className="ev-grow" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${fillPct}%`, display: "flex", borderRadius: 9, overflow: "hidden" }}>
        {d.segs.map((s, i) => s.value > 0 && <span key={i} style={{ flexGrow: s.value, background: tint(s.color) }} />)}
      </span>
      <span style={{ position: "relative", zIndex: 1, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{d.label}</span>
      <span style={{ position: "relative", zIndex: 1, color: d.valueColor ?? "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono, monospace)", flexShrink: 0, paddingLeft: 10 }}>{d.value}</span>
    </>
  );
  const common: CSSProperties = {
    position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 8, padding: "10px 12px", borderRadius: 9, overflow: "hidden", background: "var(--border)",
    fontSize: 12.5, width: "100%", textAlign: "left",
  };
  const handlers = { onMouseMove: onMove, onMouseLeave: onLeave };
  return d.onClick ? (
    <button type="button" onClick={d.onClick} {...handlers} style={{ ...common, border: "none", cursor: "pointer" }}>{inner}</button>
  ) : (
    <div {...handlers} style={common}>{inner}</div>
  );
}

/** Self-contained list with a shared tooltip. */
export function BarList({ items, empty = "No data." }: { items: BarDatum[]; empty?: string }) {
  const { move, leave, Tip } = useTip();
  if (items.length === 0) return <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>{empty}</p>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {items.map((d) => <BarRow key={d.key} d={d} onMove={d.tip ? (e) => move(e, d.tip) : undefined} onLeave={d.tip ? leave : undefined} />)}
      {Tip}
    </div>
  );
}
