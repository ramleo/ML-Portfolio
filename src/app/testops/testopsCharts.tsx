"use client";
import { useCountUp, useReducedMotion } from "../qa/dashboard/dashboardCharts";

/** Presentational pieces for the TestOps dashboard. Hand-rolled SVG, matching
 *  the rest of the site — no chart library. Colour is assigned by MEANING, never
 *  by position, so a filter that changes the series count never repaints a lane. */

export const LANE_COLOR: Record<string, string> = {
  BROWSER: "#5b8def",   // blue
  API: "#f59e0b",       // amber  (teal was avoided — too close to blue for deuteranopia)
  REPO: "#a78bfa",      // violet
  LESSON: "#94a3b8",    // slate — recorded practice, nothing to execute
  DEAD: "#475569",      // deep slate, separated from LESSON by lightness
  UNKNOWN: "#f43f5e",   // rose — the bucket that needs attention
};

export const VERDICT_COLOR: Record<string, string> = {
  PASS: "#34d399",
  HEALED: "#38bdf8",
  BUG: "#f43f5e",
  STILL_RED: "#fb7185",
  AUTHOR_EMPTY: "#f59e0b",
  NEEDS_REVIEW: "#f59e0b",
  WRONG_LANE: "#a78bfa",
};

export const laneColor = (k: string) => LANE_COLOR[k] ?? "#64748b";

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-card)",
  padding: "18px 20px",
};

export function Card({ title, hint, children, span, scroll, action }: {
  title: string; hint?: string; children: React.ReactNode; span?: number;
  /** Max height in px for the body; beyond it the body scrolls on its own. */
  scroll?: number; action?: React.ReactNode;
}) {
  return (
    <section style={{ ...card, gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{
          font: "600 13px/1.3 var(--type-body, inherit)", letterSpacing: ".04em",
          textTransform: "uppercase", color: "var(--text3)", margin: "0 0 2px",
        }}>{title}</h2>
        {action}
      </div>
      {hint && <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "0 0 14px" }}>{hint}</p>}
      {!hint && <div style={{ height: 12 }} />}
      {scroll
        ? <div style={{ maxHeight: scroll, overflowY: "auto", overscrollBehavior: "contain", paddingRight: 4 }}>{children}</div>
        : children}
    </section>
  );
}

/** A headline figure. `tone` colours only the number, never the label. */
export function Stat({ label, value, suffix, tone, sub }: {
  label: string; value: number | null; suffix?: string; tone?: string; sub?: string;
}) {
  const n = useCountUp(value ?? 0);
  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{
        fontSize: 11.5, letterSpacing: ".05em", textTransform: "uppercase",
        color: "var(--text3)", fontWeight: 600,
      }}>{label}</span>
      <span style={{
        font: `600 30px/1.1 var(--type-data, var(--font-mono, monospace))`,
        color: tone ?? "var(--text)", fontVariantNumeric: "tabular-nums",
      }}>
        {value === null ? "—" : Math.round(n).toLocaleString()}{value !== null && suffix}
      </span>
      {sub && <span style={{ fontSize: 12, color: "var(--text3)" }}>{sub}</span>}
    </div>
  );
}

/** Coverage: documented cases that have a spec. The one number this page exists
 *  to move. Rendered as a single bar because it is one part of one whole. */
export function CoverageMeter({ automated, documented }:
  { automated: number; documented: number }) {
  const pct = documented ? (automated / documented) * 100 : 0;
  const reduced = useReducedMotion();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span style={{
          font: "600 34px/1 var(--type-data, var(--font-mono, monospace))",
          color: "var(--text)", fontVariantNumeric: "tabular-nums",
        }}>{pct.toFixed(1)}%</span>
        <span style={{ fontSize: 13, color: "var(--text2)" }}>
          {automated.toLocaleString()} of {documented.toLocaleString()} documented cases have a spec
        </span>
      </div>
      <div style={{
        height: 14, borderRadius: 7, background: "var(--bg-section, rgba(127,127,127,.14))",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          width: `${Math.max(pct, pct > 0 ? 0.6 : 0)}%`, height: "100%",
          borderRadius: 7, background: "linear-gradient(90deg,#34d399,#38bdf8)",
          transition: reduced ? undefined : "width .9s cubic-bezier(.22,1,.36,1)",
        }} />
      </div>
    </div>
  );
}

/** Horizontal bars for a categorical breakdown. Every bar is labelled with its
 *  real count, so the chart never depends on reading a pixel length. */
export function Bars({ data, color, total, onSelect, selected }: {
  data: [string, number][]; color?: (k: string) => string; total?: number;
  /** When given, each row becomes a button that filters the registry below. */
  onSelect?: (key: string) => void; selected?: string;
}) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  const sum = total ?? data.reduce((a, [, v]) => a + v, 0);
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {data.map(([k, v]) => (
        <div key={k} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect ? () => onSelect(k) : undefined}
          onKeyDown={onSelect ? (e) => { if (e.key === "Enter") onSelect(k); } : undefined}
          title={onSelect ? `Show ${k} in the registry below` : undefined}
          style={{
            display: "grid", gridTemplateColumns: "104px 1fr 92px", gap: 10, alignItems: "center",
            cursor: onSelect ? "pointer" : undefined, borderRadius: 6,
            outline: selected === k ? "1px solid var(--accent)" : undefined,
            outlineOffset: 3, opacity: selected && selected !== k ? 0.5 : 1,
          }}>
          <span style={{ fontSize: 12.5, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={k}>{k}</span>
          <div style={{ height: 9, borderRadius: 5, background: "rgba(127,127,127,.14)", overflow: "hidden" }}>
            <div style={{
              width: `${(v / max) * 100}%`, height: "100%", borderRadius: 5,
              background: color ? color(k) : "var(--accent)",
            }} />
          </div>
          <span style={{
            fontSize: 12.5, color: "var(--text3)", textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}>
            {v.toLocaleString()}{sum ? ` · ${Math.round((v / sum) * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Pass/fail per day. A single snapshot hides regressions, so outcomes are
 *  always plotted over time. Empty until runs are recorded — stated, not faked. */
export function Trend({ series, onSelectDay, selectedDay }: {
  series: { day: string; pass: number; fail: number }[];
  /** Clicking a bar drills into that day — a spike you can only look at is
   *  half a chart. */
  onSelectDay?: (day: string) => void;
  selectedDay?: string;
}) {
  if (!series.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--text3)", margin: "18px 0", lineHeight: 1.6 }}>
        No runs recorded yet. This fills in once cases start executing — each
        run writes a <code>run_verdict</code> event.
      </p>
    );
  }
  const W = 640, H = 150, pad = 26;
  const max = Math.max(1, ...series.map((d) => d.pass + d.fail));
  const bw = Math.max(6, (W - pad * 2) / series.length - 4);
  return (
    <figure style={{ margin: 0 }} role="img"
      aria-label={`Daily test outcomes across ${series.length} days`}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", maxWidth: "100%" }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" strokeWidth="1" />
        {series.map((d, i) => {
          const x = pad + i * ((W - pad * 2) / series.length);
          const t = d.pass + d.fail;
          const hAll = ((H - pad * 2) * t) / max;
          const hPass = t ? hAll * (d.pass / t) : 0;
          const dim = selectedDay && selectedDay !== d.day;
          return (
            <g key={d.day} onClick={onSelectDay ? () => onSelectDay(d.day) : undefined}
              style={{ cursor: onSelectDay ? "pointer" : undefined, opacity: dim ? 0.4 : 1 }}>
              <title>{`${d.day} — ${d.pass} passed, ${d.fail} failed`}</title>
              {/* a hit target wider than the bar, so a 6px bar is still clickable */}
              {onSelectDay && (
                <rect x={x - 2} y={pad - 10} width={bw + 4} height={H - pad * 2 + 20}
                  fill="transparent" />
              )}
              <rect x={x} y={H - pad - hAll} width={bw} height={hAll - hPass}
                fill={VERDICT_COLOR.BUG} rx="2" />
              <rect x={x} y={H - pad - hPass} width={bw} height={hPass}
                fill={VERDICT_COLOR.PASS} rx="2" />
            </g>
          );
        })}
        <text x={pad} y={H - 8} fontSize="10" fill="var(--text3)">{series[0].day}</text>
        <text x={W - pad} y={H - 8} fontSize="10" fill="var(--text3)" textAnchor="end">
          {series[series.length - 1].day}
        </text>
      </svg>
    </figure>
  );
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
      {items.map(([label, c]) => (
        <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: c, flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  );
}
