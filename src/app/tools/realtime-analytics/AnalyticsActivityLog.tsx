"use client";

import { useEffect, useState } from "react";

/** Unified Activity Log — a HuggingFace-Space-style chronological feed of EVERYTHING
 * that happened: every LLM call (ok / warning / 429 / error / in-band failure) merged
 * with app errors, newest first. Filter by level, and CLICK any row to expand its full
 * detail (status, provider error envelope, trace id, latency). This is the "see what's
 * wrong or not" log — unlike the Errors panel it shows OK and recovered-429 rows too. */

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
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setOpen(null);
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

  if (rows === null) return null;

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">Activity Log — {rangeLabel}</p>
        <div className="flex items-center gap-1.5">
          <Chip id="all" label="All" />
          <Chip id="warn" label="Warnings" n={counts.warn} color={COLOR.warn} />
          <Chip id="error" label="Errors" n={counts.error} color={COLOR.error} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No activity in this range.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-[460px] overflow-y-auto font-mono">
          {rows.map((r, i) => {
            const expanded = open === i;
            return (
              <div key={i} className="rounded-md border border-[var(--border)]" style={{ background: "var(--bg)" }}>
                <button onClick={() => setOpen(expanded ? null : i)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
                  <span className="text-[9px] font-bold rounded px-1.5 py-0.5 shrink-0"
                    style={{ color: COLOR[r.level], border: `1px solid ${COLOR[r.level]}` }}>{WORD[r.level]}</span>
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{fmt(r.ts)}</span>
                  <span className="text-[11px] truncate flex-1" style={{ color: "var(--text2)" }}>{r.summary}</span>
                  {r.latency_ms != null && <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{r.latency_ms}ms</span>}
                </button>
                {expanded && (
                  <div className="px-2.5 pb-2 pt-0.5 text-[10.5px] flex flex-col gap-1" style={{ color: "var(--text2)" }}>
                    {r.detail && <p className="break-words whitespace-pre-wrap" style={{ color: COLOR[r.level] }}>{r.detail}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5" style={{ color: "var(--text3)" }}>
                      <span>kind: {r.kind}</span>
                      <span>source: {r.source}</span>
                      {r.http_status != null && <span>http: {r.http_status}</span>}
                      {r.tool && <span>tool: {r.tool}</span>}
                      {r.trace_id && <span>trace: {r.trace_id}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[9.5px] mt-3" style={{ color: "var(--text3)" }}>
        Every call & error, newest first — OK, warnings and 429s included (not just crashes). Click a row for its full detail. Raw request logs: Vercel / HF Space, joined by trace id.
      </p>
    </div>
  );
}
