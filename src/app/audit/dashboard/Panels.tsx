"use client";
import { useState } from "react";

/** Presentational panels for the internal click-audit dashboard.
 *
 * Every chart here is SINGLE-series (magnitude or change-over-time), so there is
 * no categorical palette to validate: marks use the site accent as the one
 * sequential hue, and all text stays on the theme's text tokens (dataviz rule:
 * text wears text tokens, never the mark color). Thin marks, rounded data-ends,
 * recessive axes, selective direct labels, hover tooltips.
 */

export const card: React.CSSProperties = {
  background: "var(--bg-glass)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem 1.1rem",
};

/** A headline number — the right form when the data is one figure, not a plot. */
export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

export interface BarRow { label: string; count: number; sub?: string }

/** Horizontal bar-list: magnitude ranked, value direct-labelled at the row end. */
export function BarList({ title, rows, empty }: { title: string; rows: BarRow[]; empty?: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div style={card}>
      <h2 style={panelTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: "0.5rem 0 0" }}>{empty || "No data in this window."}</p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: "0.6rem" }}>
          {rows.map((r, i) => (
            <div key={i} title={`${r.label} — ${r.count.toLocaleString()}`} style={{ display: "grid", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.label}
                  {r.sub && <span style={{ color: "var(--text3)", marginLeft: 6, fontSize: 12 }}>{r.sub}</span>}
                </span>
                <span style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{r.count.toLocaleString()}</span>
              </div>
              {/* Thin mark, 4px rounded data-end, anchored to the baseline (left). */}
              <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, (r.count / max) * 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SeriesPoint { t: number; count: number }

/** Change-over-time: a single-series area+line with a hover crosshair + tooltip. */
export function TimeSeries({ title, points, bucket }: { title: string; points: SeriesPoint[]; bucket: "hour" | "day" }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 200, padL = 36, padR = 12, padT = 12, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = points.reduce((m, p) => Math.max(m, p.count), 0) || 1;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (c: number) => padT + plotH - (c / max) * plotH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");
  const area = n > 0 ? `${line} L${x(n - 1).toFixed(1)},${(padT + plotH).toFixed(1)} L${x(0).toFixed(1)},${(padT + plotH).toFixed(1)} Z` : "";
  const fmt = (t: number) => new Date(t).toLocaleString([], bucket === "day"
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", hour: "numeric" });
  // Selective x labels: about 6 ticks, never one per point.
  const step = Math.max(1, Math.ceil(n / 6));

  return (
    <div style={card}>
      <h2 style={panelTitle}>{title}</h2>
      {n === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: "0.5rem 0 0" }}>No clicks in this window.</p>
      ) : (
        <div style={{ position: "relative", marginTop: "0.5rem" }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${points.reduce((s, p) => s + p.count, 0)} clicks over time`}
            style={{ width: "100%", height: "auto", display: "block" }}
            onMouseMove={(e) => {
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const i = Math.round(((px - padL) / plotW) * (n - 1));
              setHover(Math.min(n - 1, Math.max(0, i)));
            }}
            onMouseLeave={() => setHover(null)}
          >
            {/* recessive y gridline at max */}
            <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="var(--border)" strokeWidth={1} />
            <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize={10} fill="var(--text3)">{max}</text>
            <text x={padL - 6} y={padT + plotH} textAnchor="end" fontSize={10} fill="var(--text3)">0</text>
            <path d={area} fill="var(--accent)" opacity={0.14} />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (i % step === 0 || i === n - 1) && (
              <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--text3)">{fmt(p.t)}</text>
            ))}
            {hover !== null && (
              <>
                <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + plotH} stroke="var(--text3)" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(points[hover].count)} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} />
              </>
            )}
          </svg>
          {hover !== null && (
            <div style={{
              position: "absolute", top: 0, left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)",
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px",
              fontSize: 12, color: "var(--text)", pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{points[hover].count}</strong> · {fmt(points[hover].t)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface RecentRow {
  event_uuid: string; client_ts: string; created_at: string;
  actor: string | null; control: string; path: string; label: string | null;
}

export function RecentFeed({ rows }: { rows: RecentRow[] }) {
  return (
    <div style={card}>
      <h2 style={panelTitle}>Recent clicks</h2>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: "0.5rem 0 0" }}>No clicks in this window.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "0.6rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "var(--text)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text3)" }}>
                <th style={th}>When</th><th style={th}>What</th><th style={th}>Actor</th><th style={th}>Path</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.event_uuid} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(r.client_ts || r.created_at).toLocaleString()}</td>
                  <td style={{ ...td, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label || r.control}>{r.label || r.control}</td>
                  <td style={{ ...td, fontFamily: "monospace", color: "var(--text2)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.actor || "—"}</td>
                  <td style={{ ...td, color: "var(--text2)" }}>{r.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const panelTitle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 };
const th: React.CSSProperties = { padding: "0.4rem 0.5rem", fontWeight: 600 };
const td: React.CSSProperties = { padding: "0.4rem 0.5rem", verticalAlign: "top" };
