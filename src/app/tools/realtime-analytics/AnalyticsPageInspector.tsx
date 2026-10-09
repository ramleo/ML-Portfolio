"use client";

import { useEffect, useState } from "react";

/** O5/(A): Page Inspector — pick a page (route) and read its individual error
 * occurrences, recent first. AnalyticsErrors groups errors; this is the drill-in
 * "what actually happened on this page" log tail, in-app, without leaving for the
 * Vercel/HF raw logs. Content-free: time, source, kind, the provider-enriched
 * message, and the trace id (O1) that ties the row to the browser action. */

const ACCENT = "#2dd4bf"; // teal — distinct from Errors (red), LLM (sky), SLO (violet)
const SRC_COLOR: Record<string, string> = { backend: "#f59e0b", frontend: "#38bdf8" };

type Occurrence = { created_at: string; source: string; kind: string; message: string; trace_id: string };
type RouteOpt = { route: string; n: number };

interface Props {
  range: string;
  customRange: { start: string; end: string } | null;
  rangeLabel: string;
}

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

function qs(range: string, customRange: Props["customRange"]): string {
  return range === "custom" && customRange
    ? `start=${customRange.start}&end=${customRange.end}`
    : `range=${range}`;
}

export default function AnalyticsPageInspector({ range, customRange, rangeLabel }: Props) {
  const [routes, setRoutes] = useState<RouteOpt[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<Occurrence[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // Load the list of pages that had errors in the window.
  useEffect(() => {
    let cancelled = false;
    setRoutes(null); setSelected(""); setRows([]);
    fetch(`/api/error-detail?${qs(range, customRange)}`)
      .then(r => r.json())
      .then((d: { routes?: RouteOpt[] }) => {
        if (cancelled) return;
        const rs = d.routes ?? [];
        setRoutes(rs);
        if (rs.length) setSelected(rs[0].route);
      })
      .catch(() => { if (!cancelled) setRoutes([]); });
    return () => { cancelled = true; };
  }, [range, customRange]);

  // Load the selected page's occurrences.
  useEffect(() => {
    if (!selected) { setRows([]); return; }
    let cancelled = false;
    setLoadingRows(true);
    fetch(`/api/error-detail?route=${encodeURIComponent(selected)}&${qs(range, customRange)}`)
      .then(r => r.json())
      .then((d: { rows?: Occurrence[] }) => { if (!cancelled) setRows(d.rows ?? []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoadingRows(false); });
    return () => { cancelled = true; };
  }, [selected, range, customRange]);

  if (routes === null) return null; // first load

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">Page Inspector — {rangeLabel}</p>
        {routes.length > 0 && (
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="text-[11px] rounded-md border border-[var(--border)] px-2 py-1 max-w-[60%]"
            style={{ background: "var(--bg)", color: "var(--text)" }}
          >
            {routes.map(r => (
              <option key={r.route} value={r.route}>{r.route} ({r.n})</option>
            ))}
          </select>
        )}
      </div>

      {routes.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No errors on any page in this range — nothing to inspect.</p>
      ) : loadingRows ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>Loading {selected}…</p>
      ) : rows.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>No occurrences for {selected} in this range.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] px-3 py-2" style={{ background: "var(--bg)" }}>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] rounded px-1.5 py-0.5 shrink-0"
                    style={{ color: SRC_COLOR[r.source] ?? "var(--text3)", border: `1px solid ${SRC_COLOR[r.source] ?? "var(--border)"}` }}>
                    {r.source || "—"}
                  </span>
                  <span className="text-[11px] font-semibold truncate" style={{ color: ACCENT }}>{r.kind}</span>
                </span>
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{fmtTime(r.created_at)}</span>
              </div>
              {r.message && (
                <p className="text-[10.5px] font-mono leading-snug break-words" style={{ color: "var(--text2)" }}>{r.message}</p>
              )}
              {r.trace_id && (
                <p className="text-[9px] font-mono mt-1" style={{ color: "var(--text3)" }}>trace {r.trace_id}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[9.5px] mt-3" style={{ color: "var(--text3)" }}>
        Individual error occurrences per page. For raw request logs, see Vercel Runtime Logs (frontend) or the HF Space logs (backend) — joined by the trace id.
      </p>
    </div>
  );
}
