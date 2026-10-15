"use client";
import { Sparkline, type SeriesPoint } from "./charts";

/** Cards, bar-lists and the feed for the click-audit dashboard. Every number
 * carries a baseline (delta vs the previous equal window) per dashboard best
 * practice — a bare figure with no comparison is just decoration. */

export const card: React.CSSProperties = {
  background: "var(--bg-glass)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "1.1rem 1.2rem",
};

const GREEN = "rgb(16,185,129)", RED = "rgb(239,68,68)";

/** Minimal stroke icons (no emoji, per house rule). */
const icons: Record<string, React.ReactNode> = {
  clicks: <path d="M5 3l14 7-6 2-2 6z" />,
  actors: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19a6.5 6.5 0 0113 0" /></>,
  sessions: <><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M9 20h6" /></>,
  controls: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 12l2 2 4-4" /></>,
  pages: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></>,
};
function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

/** Direction + percent change vs the previous period — arrow so it is never color-only. */
function Delta({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null) return null;
  const diff = cur - prev;
  const pct = prev === 0 ? (cur === 0 ? 0 : 100) : (diff / prev) * 100;
  const color = diff > 0 ? GREEN : diff < 0 ? RED : "var(--text3)";
  const glyph = diff > 0 ? "▲" : diff < 0 ? "▼" : "→";
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color, display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span>{glyph} {Math.abs(Math.round(pct))}%</span>
      <span style={{ color: "var(--text3)", fontWeight: 400 }}>vs prev</span>
    </span>
  );
}

export function StatCard({ label, value, prev, icon, featured, spark, bucket }: {
  label: string; value: number; prev: number | null; icon: string;
  featured?: boolean; spark?: SeriesPoint[]; bucket?: "hour" | "day";
}) {
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 6, gridColumn: featured ? "span 2" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name={icon} />
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)" }}>{label}</span>
      </div>
      <div style={{ fontSize: featured ? "2.4rem" : "1.9rem", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
        {value.toLocaleString()}
      </div>
      <Delta cur={value} prev={prev} />
      {featured && spark && spark.length > 1 && (
        <div style={{ marginTop: "auto", paddingTop: 10 }}>
          <Sparkline points={spark} />
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>per {bucket}</div>
        </div>
      )}
    </div>
  );
}

export interface BarRow { label: string; count: number; sub?: string }

export function BarList({ title, rows, empty }: { title: string; rows: BarRow[]; empty?: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div style={card}>
      <h2 style={panelTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: "0.5rem 0 0" }}>{empty || "No data in this window."}</p>
      ) : (
        <div style={{ display: "grid", gap: 9, marginTop: "0.7rem" }}>
          {rows.map((r, i) => (
            <div key={i} title={`${r.label} — ${r.count.toLocaleString()}`} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, alignItems: "baseline" }}>
                <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  <span style={{ color: "var(--text3)", fontVariantNumeric: "tabular-nums", marginRight: 8 }}>{i + 1}</span>
                  {r.label}
                  {r.sub && <span style={{ color: "var(--text3)", marginLeft: 6, fontSize: 11.5 }}>{r.sub}</span>}
                </span>
                <span style={{ color: "var(--text)", fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{r.count.toLocaleString()}</span>
              </div>
              <div style={{ height: 7, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(3, (r.count / max) * 100)}%`, height: "100%", background: "linear-gradient(90deg, color-mix(in srgb, var(--accent) 70%, transparent), var(--accent))", borderRadius: 4 }} />
              </div>
            </div>
          ))}
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
        <div style={{ overflowX: "auto", marginTop: "0.7rem", maxHeight: 460, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "var(--text)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text3)", position: "sticky", top: 0, background: "var(--bg-glass)" }}>
                <th style={th}>When</th><th style={th}>What</th><th style={th}>Actor</th><th style={th}>Path</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.event_uuid} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...td, whiteSpace: "nowrap", color: "var(--text2)" }}>{new Date(r.client_ts || r.created_at).toLocaleString()}</td>
                  <td style={{ ...td, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label || r.control}>{r.label || r.control}</td>
                  <td style={{ ...td, fontFamily: "monospace", color: "var(--text2)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.actor || "—"}</td>
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

/** A small uppercase section eyebrow to group the page (status / trends / breakdown). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", margin: "0.5rem 0 -0.2rem", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

const panelTitle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 };
const th: React.CSSProperties = { padding: "0.45rem 0.55rem", fontWeight: 600 };
const td: React.CSSProperties = { padding: "0.45rem 0.55rem", verticalAlign: "top" };
