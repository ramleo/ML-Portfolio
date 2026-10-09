"use client";

import { useEffect, useState } from "react";

/** O5: SLO scorecard (/api/slo). Each objective is one row — current value vs
 * target, with a status chip that carries BOTH a colour and a word (never colour
 * alone), so a red/green reader and a greyscale reader both get the state. The
 * slo-watch GitHub Action reads the same endpoint and emails on a breach; this
 * panel is the at-a-glance view. Content-free: ratios, timings and counts only. */

const ACCENT = "#a78bfa"; // violet — distinct from Errors (red) and LLM (sky)
const COLOR: Record<Status, string> = {
  ok: "#22c55e", warn: "#f59e0b", breach: "#e06c75", insufficient: "var(--text3)",
};
const WORD: Record<Status, string> = {
  ok: "OK", warn: "WARN", breach: "BREACH", insufficient: "—",
};

type Status = "ok" | "warn" | "breach" | "insufficient";
type Slo = {
  id: string; label: string; type: "ratio" | "latency" | "count";
  value: number | null; target: number; unit: string; sample: number; status: Status;
};
type Data = { slos: Slo[]; breached: string[]; needs_setup?: boolean; rate_limited_excluded?: number };

interface Props {
  range: string;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
}

const fmtMs = (n: number | null) => (n === null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
const fmtPct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

/** "value / target" phrased per SLO type. */
function valueVsTarget(s: Slo): string {
  if (s.type === "ratio") return `${fmtPct(s.value)} / ≥ ${fmtPct(s.target)}`;
  if (s.type === "latency") return `${fmtMs(s.value)} / ≤ ${fmtMs(s.target)}`;
  return `${s.value ?? 0} / < ${s.target}`;
}

export default function AnalyticsSLO({ range, customRange, rangeLabel }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const url = range === "custom" && customRange
      ? `/api/slo?start=${customRange.start}&end=${customRange.end}`
      : `/api/slo?range=${range}`;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then((d: Data) => { if (!cancelled) { setData(d); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [range, customRange]);

  if (!loaded) return null;

  if (data?.needs_setup) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-2">SLOs</p>
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Needs the <code style={{ color: ACCENT }}>llm_calls</code> and <code style={{ color: ACCENT }}>errors</code> tables — run their migrations to enable the SLO scorecard.
        </p>
      </div>
    );
  }

  const slos = data?.slos ?? [];
  const breaches = data?.breached?.length ?? 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">SLOs — {rangeLabel}</p>
        <span className="text-[11px] font-semibold tabular-nums"
          style={{ color: breaches ? COLOR.breach : COLOR.ok }}>
          {breaches ? `${breaches} breaching` : "all within target"}
        </span>
      </div>

      {slos.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No SLO data in this range.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {slos.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
              style={{ background: "var(--bg)" }}>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{s.label}</p>
                <p className="text-[10.5px] tabular-nums" style={{ color: "var(--text3)" }}>{valueVsTarget(s)}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] rounded-md px-2 py-1 shrink-0"
                style={{ color: COLOR[s.status], border: `1px solid ${COLOR[s.status]}`, background: "var(--bg-glass)" }}>
                {WORD[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[9.5px] mt-3" style={{ color: "var(--text3)" }}>
        Fast-burn signal — the slo-watch job polls this and emails on a breach. Ratio SLOs stay “—” until enough calls to judge.
        {!!data?.rate_limited_excluded && ` ${data.rate_limited_excluded} rate-limited (429) call${data.rate_limited_excluded === 1 ? "" : "s"} excluded — expected free-tier throttling the cascade recovers from.`}
      </p>
    </div>
  );
}
