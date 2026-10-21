"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import { C } from "./format";

/** Shared chrome so every panel in the section reads as one system: a card with a
 * title, an optional one-line "what this shows" caption, an optional info dot, and
 * an optional control slot on the right. */

const cardBase: CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)", padding: "18px 20px",
};

export function Panel({ title, sub, info, right, children, danger }:
  { title?: string; sub?: string; info?: string; right?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <div style={{ ...cardBase, borderColor: danger ? C.err : "var(--border2)" }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: sub ? 4 : 14 }}>
          <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            {title}{info && <InfoDot text={info} />}
          </h3>
          {right}
        </div>
      )}
      {sub && <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "0 0 14px", lineHeight: 1.5 }}>{sub}</p>}
      {children}
    </div>
  );
}

/** A titled band grouping related panels with a hairline divider. */
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
        <h2 style={{ fontFamily: "var(--type-display)", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: 0 }}>{title}</h2>
        {hint && <span style={{ fontSize: 12, color: "var(--text3)" }}>{hint}</span>}
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      {children}
    </section>
  );
}

/** A big-number tile with an optional change chip and a muted sub-line. */
export function StatTile({ label, value, sub, delta, accent }:
  { label: string; value: string; sub?: ReactNode; delta?: ReactNode; accent?: string }) {
  return (
    <div style={{ ...cardBase, padding: "15px 17px" }}>
      <p style={{ fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 7px" }}>{label}</p>
      <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, color: accent ?? "var(--text)", margin: 0 }}>{value}</p>
      {(sub || delta) && (
        <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "5px 0 0", display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
          {sub && <span>{sub}</span>}{delta}
        </p>
      )}
    </div>
  );
}

/** Identity legend for ≥2 series (always present; ≤4 series are also direct-labeled). */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--text2)" }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: it.color, display: "inline-block" }} />{it.label}
        </span>
      ))}
    </div>
  );
}

/** Neutral period-over-period chip — informational (↑/↓), never good/bad, so it
 * never borrows the reserved error color. `pp` = percentage-point diff for rates. */
export function DeltaChip({ cur, prev, pp = false }: { cur: number | null; prev: number | null | undefined; pp?: boolean }) {
  if (cur == null || prev == null) return null;
  const diff = pp ? (cur - prev) * 100 : prev === 0 ? null : ((cur - prev) / prev) * 100;
  if (diff == null) return prev === 0 && cur > 0 ? <span style={{ color: "var(--text3)", fontSize: 12 }}>new</span> : null;
  if (Math.abs(diff) < 0.05) return <span style={{ color: "var(--text3)", fontSize: 12 }}>flat</span>;
  const up = diff > 0;
  const mag = pp ? `${Math.abs(diff).toFixed(1)}pp` : `${Math.abs(diff).toFixed(0)}%`;
  return (
    <span style={{ color: "var(--text3)", fontSize: 12, fontVariantNumeric: "tabular-nums" }} title="vs the previous equal period">
      {up ? "↑" : "↓"}{mag}
    </span>
  );
}

/** A hoverable "i" that explains a panel in one line — no clutter until wanted. */
export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen((o) => !o)}>
      <span style={{ width: 15, height: 15, borderRadius: "50%", border: "1px solid var(--border2)", color: "var(--text3)", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", fontFamily: "var(--type-sans, sans-serif)" }} aria-label={text}>i</span>
      {open && (
        <span role="tooltip" style={{ position: "absolute", top: "130%", left: 0, zIndex: 50, width: 240, background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", padding: "8px 11px", fontSize: 12, fontWeight: 400, lineHeight: 1.5, color: "var(--text2)", textTransform: "none", letterSpacing: 0 }}>{text}</span>
      )}
    </span>
  );
}
