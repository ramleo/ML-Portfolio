"use client";

/** Q4 M1 (feature C) — cost-per-day and p95-latency-per-day trend lines, drawn
 * from the same daily series the calls chart uses. One linear scale per chart,
 * single accent hue, gap-filled days. Content-free. */

export interface Day {
  date: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null;
}

const ACCENT = "var(--accent)";
const card: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)", padding: "18px 20px",
};
const usd = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
const ms = (x: number) => (x >= 1000 ? `${(x / 1000).toFixed(1)}s` : `${Math.round(x)}ms`);

function LineChart({ title, days, pick, fmt }:
  { title: string; days: Day[]; pick: (d: Day) => number | null; fmt: (x: number) => string }) {
  const W = 520, H = 120, padL = 8, padR = 8, padB = 16, padT = 8;
  const vals = days.map(pick);
  const nums = vals.filter((v): v is number => v != null);
  const max = Math.max(1e-9, ...nums);
  const peak = nums.length ? Math.max(...nums) : 0;
  const n = days.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  // Build the line only across days that have a value (null = no calls that day).
  const pts: string[] = [];
  vals.forEach((v, i) => { if (v != null) pts.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`); });
  const line = pts.join(" ");
  const lastIdx = [...vals].map((v, i) => (v != null ? i : -1)).filter(i => i >= 0).pop() ?? -1;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>{title}</h3>
        <span style={{ fontSize: 12, color: "var(--text3)", fontVariantNumeric: "tabular-nums" }}>peak {nums.length ? fmt(peak) : "—"}</span>
      </div>
      {nums.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No data.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={title} preserveAspectRatio="none">
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border2)" strokeWidth={1} />
          {pts.length > 1 && <polyline points={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {vals.map((v, i) => v != null && (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === lastIdx ? 3.5 : 2} fill={ACCENT}>
              <title>{`${days[i].date}: ${fmt(v)}`}</title>
            </circle>
          ))}
        </svg>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text3)" }}>
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function EvalTrends({ daily }: { daily: Day[] }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
      <LineChart title="Cost per day" days={daily} pick={(d) => d.cost_usd} fmt={usd} />
      <LineChart title="p95 latency per day" days={daily} pick={(d) => d.p95_ms} fmt={ms} />
    </div>
  );
}
