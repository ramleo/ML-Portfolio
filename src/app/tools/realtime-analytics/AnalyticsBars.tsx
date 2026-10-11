"use client";

/** Row-fill horizontal bars — the approved redesign pattern (Plausible/Vercel style):
 * the row itself IS the bar, with the label on the left and the value on the right
 * riding on top of a tinted fill. Shared by every bar panel so they read as one system.
 *
 * Fill encodes meaning:
 *   - a RAW COUNT  → flat single-accent fill
 *   - a 0–100 SCORE → vibrant indigo→sky→emerald gradient (a longer bar reaches toward
 *     green = higher score), matching the Conversion Funnel.
 */

const COUNT_FILL = "rgba(129,140,248,0.26)";
const SCORE_FILL = "linear-gradient(90deg,rgba(129,140,248,.55),rgba(56,189,248,.45) 55%,rgba(52,211,153,.6))";

/** A labelled section divider — groups the dashboard into a readable scroll-story
 * (Overview · Trends · Tool Usage · Audience · Quality · LLM Observability · Engagement). */
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <h2 className="text-[11px] font-bold font-mono uppercase tracking-[0.16em] m-0" style={{ color: "var(--text2)" }}>{label}</h2>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, var(--border2), transparent)" }} />
    </div>
  );
}

export interface BarRow { label: string; value: number; display?: string; title?: string; }

export function RowBars({
  data, score = false, max: maxProp, empty = "No data yet", maxRows = 8, scroll = true,
}: {
  data: BarRow[]; score?: boolean; max?: number; empty?: string; maxRows?: number; scroll?: boolean;
}) {
  if (!data.length)
    return <div className="h-16 flex items-center justify-center text-xs text-[var(--text3)]">{empty}</div>;

  const shown = data.slice(0, maxRows);
  const max = maxProp ?? Math.max(...shown.map(d => d.value), 1);

  return (
    <div className={`flex flex-col gap-1.5 ${scroll ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
      {shown.map((d, i) => (
        <div key={i} title={d.title}
          className="relative flex items-center justify-between gap-3 px-3 py-2.5 rounded-[9px] overflow-hidden transition-colors"
          style={{ background: "var(--border)" }}>
          <span className="absolute left-0 top-0 bottom-0 rounded-[9px] origin-left"
            style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, background: score ? SCORE_FILL : COUNT_FILL }} />
          <span className="relative z-[1] text-[12.5px] truncate" style={{ color: "var(--text)" }}>{d.label}</span>
          <span className="relative z-[1] text-[12.5px] font-semibold tabular-nums shrink-0 font-mono" style={{ color: "var(--text)" }}>
            {d.display ?? d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
