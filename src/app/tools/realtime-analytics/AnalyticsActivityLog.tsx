"use client";

import { useEffect, useRef, useState } from "react";

/** Unified Activity Log — a HuggingFace-Space-style chronological feed of EVERYTHING
 * that happened: every LLM call (ok / warning / 429 / error / in-band failure) merged
 * with app errors, newest first. Warnings and errors show their reason INLINE (no
 * click needed); the row still carries http / tool / trace for joining to raw logs.
 * The list sits in a fixed-height scroller so switching filters never resizes the
 * card (which used to jump the page). Another panel can focus this log via the
 * "airaml:activity-focus" window event (sets a filter + scrolls here). */

type Level = "ok" | "warn" | "error";
type Row = {
  ts: string; level: Level; kind: "llm" | "app"; source: string; summary: string;
  http_status: number | null; detail: string; trace_id: string; latency_ms: number | null; tool: string;
};
type Counts = { ok: number; warn: number; error: number };

const COLOR: Record<Level, string> = { ok: "#34d399", warn: "#f59e0b", error: "#f87171" };
const WORD: Record<Level, string> = { ok: "OK", warn: "WARN", error: "ERROR" };

interface Props { range: string; customRange: { start: string; end: string } | null; rangeLabel: string; }

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return iso; }
};
function qs(range: string, cr: Props["customRange"]): string {
  return range === "custom" && cr ? `start=${cr.start}&end=${cr.end}` : `range=${range}`;
}

export default function AnalyticsActivityLog({ range, customRange, rangeLabel }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ ok: 0, warn: 0, error: 0 });
  const [filter, setFilter] = useState<"all" | "warn" | "error">("all");
  const rootRef = useRef<HTMLDivElement>(null);

  // Let another panel (e.g. the LLM breakdown's "23 err") focus this log: set a
  // filter and scroll it into view. Cross-component, no shared store needed.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const d = (e as CustomEvent).detail as { filter?: "all" | "warn" | "error" } | undefined;
      if (d?.filter) setFilter(d.filter);
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("airaml:activity-focus", onFocus);
    return () => window.removeEventListener("airaml:activity-focus", onFocus);
  }, []);

  // NOTE: we do NOT clear rows on a filter/range change — the previous list stays
  // until the new one lands, so the fixed-height scroller never collapses and the
  // page does not jump.
  useEffect(() => {
    let cancelled = false;
    const lvl = filter === "all" ? "" : `&level=${filter}`;
    fetch(`/api/activity?${qs(range, customRange)}${lvl}`)
      .then(r => r.json())
      .then((d: { rows?: Row[]; counts?: Counts }) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        if (d.counts) setCounts(d.counts);
      })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [range, customRange, filter]);

  const Chip = ({ id, label, n, color }: { id: "all" | "warn" | "error"; label: string; n?: number; color?: string }) => (
    <button onClick={() => setFilter(id)}
      className="text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-colors"
      style={{ borderColor: filter === id ? (color ?? "var(--text2)") : "var(--border)",
        color: filter === id ? (color ?? "var(--text)") : "var(--text3)",
        background: filter === id ? `${color ?? "#888"}1a` : "transparent" }}>
      {label}{typeof n === "number" ? ` ${n}` : ""}
    </button>
  );

  return (
    <div ref={rootRef} id="activity-log" className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5 scroll-mt-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">Activity Log — {rangeLabel}</p>
        <div className="flex items-center gap-1.5">
          <Chip id="all" label="All" />
          <Chip id="warn" label="Warnings" n={counts.warn} color={COLOR.warn} />
          <Chip id="error" label="Errors" n={counts.error} color={COLOR.error} />
        </div>
      </div>

      <div className="h-[440px] overflow-y-auto flex flex-col gap-1 font-mono">
        {rows === null ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>No activity in this range.</p>
        ) : (
          rows.map((r, i) => {
            const showDetail = r.level !== "ok";   // warnings + errors reveal their reason inline
            return (
              <div key={i} className="rounded-md border border-[var(--border)]" style={{ background: "var(--bg)" }}>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="text-[9px] font-bold rounded px-1.5 py-0.5 shrink-0"
                    style={{ color: COLOR[r.level], border: `1px solid ${COLOR[r.level]}` }}>{WORD[r.level]}</span>
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{fmt(r.ts)}</span>
                  <span className="text-[11px] truncate flex-1" style={{ color: showDetail ? COLOR[r.level] : "var(--text2)" }}>{r.summary}</span>
                  {r.latency_ms != null && <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{r.latency_ms}ms</span>}
                </div>
                {showDetail && (
                  <div className="px-2.5 pb-2 -mt-0.5 text-[10.5px] flex flex-col gap-1" style={{ color: "var(--text2)" }}>
                    {r.detail && <p className="break-words whitespace-pre-wrap" style={{ color: COLOR[r.level] }}>{r.detail}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5" style={{ color: "var(--text3)" }}>
                      {r.http_status != null && <span>http: {r.http_status}</span>}
                      {r.tool && <span>tool: {r.tool}</span>}
                      {r.source && <span>source: {r.source}</span>}
                      {r.trace_id && <span>trace: {r.trace_id}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="text-[9.5px] mt-3" style={{ color: "var(--text3)" }}>
        Every call & error, newest first — OK, warnings and 429s included (not just crashes). Warnings and errors show their reason inline. Raw request logs: Vercel / HF Space, joined by trace id.
      </p>
    </div>
  );
}
