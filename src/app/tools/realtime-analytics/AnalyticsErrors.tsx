"use client";

import { useEffect, useMemo, useState } from "react";
import { pathLabel } from "./AnalyticsQueryByTool";

/** DIY error store (supabase/errors.sql) — grouped faults from the `error_groups`
 * RPC via /api/error. This is the "our own Sentry" read view: one row per distinct
 * fault, ranked by count, with the page it happened on and a sample message.
 * Single-hue magnitude bars (one series); a warm accent marks this as the
 * problems panel. Content-free — no request data is ever stored or shown. */

const ACCENT = "#e06c75"; // warm red: this is the attention/problems panel

type Group = {
  fingerprint: string; source: string; kind: string; route: string;
  sample_message: string | null; n: number; first_seen: string; last_seen: string;
};

interface Props {
  range: string;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AnalyticsErrors({ range, customRange, rangeLabel }: Props) {
  const [rows, setRows] = useState<Group[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const url = range === "custom" && customRange
      ? `/api/error?start=${customRange.start}&end=${customRange.end}`
      : `/api/error?range=${range}`;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then((d: { rows?: Group[]; needs_setup?: boolean }) => {
        if (cancelled) return;
        setRows(d.rows ?? []);
        setNeedsSetup(!!d.needs_setup);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [range, customRange]);

  const total = useMemo(() => rows.reduce((a, r) => a + r.n, 0), [rows]);
  const max = Math.max(...rows.map(r => r.n), 1);

  if (!loaded) return null;

  if (needsSetup) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-2">Errors</p>
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Run <code style={{ color: ACCENT }}>supabase/errors.sql</code> in the Supabase SQL editor to enable durable error tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">
          Errors — {rangeLabel}
        </p>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: rows.length ? ACCENT : "var(--text3)" }}>
          {total} total · {rows.length} distinct
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No errors in this range. Clean run.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(g => (
            <div key={g.fingerprint}>
              <div className="flex justify-between items-center gap-2 mb-1">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full shrink-0"
                    style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>
                    {g.source}
                  </span>
                  <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>{g.kind}</span>
                </span>
                <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: ACCENT }}>
                  {g.n} · {ago(g.last_seen)}
                </span>
              </div>
              <div className="h-1.5 rounded-full mb-1" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full" style={{ width: `${(g.n / max) * 100}%`, background: ACCENT }} />
              </div>
              <div className="text-[10px] truncate" style={{ color: "var(--text3)" }}>
                {g.route ? pathLabel(g.route) : "—"}
                {g.sample_message ? <span style={{ color: "var(--text2)" }}> · {g.sample_message}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
