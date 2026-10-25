"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { laneColor, VERDICT_COLOR, age } from "./testopsCharts";
import { Chip, Detail } from "./CaseDetail";
import type { CaseRow, EventRow } from "./types";

/** The registry itself: every documented case, filterable, with a drill-down
 *  panel showing the full case text, what it resolved to, and its history. */

const LANES = ["BROWSER", "API", "REPO", "LESSON", "UNKNOWN", "DEAD"];

type SortCol = "tc_id" | "test_name" | "lane" | "target_url" | "last_verdict" | "age";
const COLUMNS: { key: SortCol; label: string }[] = [
  { key: "tc_id", label: "ID" },
  { key: "test_name", label: "Test name" },
  { key: "lane", label: "Lane" },
  { key: "target_url", label: "Target" },
  { key: "last_verdict", label: "Verdict" },
  { key: "age", label: "Age" },
];

/** Sort key for a column. Age sorts by the timestamp it is derived from, so
 *  "oldest red first" is one click — which is the question worth asking. */
function sortKey(c: CaseRow, col: SortCol): string {
  if (col === "age") return c.red_since ?? c.last_run_at ?? "9999";
  return String(c[col] ?? "~");   // "~" sorts unset values last
}

export default function CaseTable({ cases, events, lane, setLane, day, now }: {
  cases: CaseRow[]; events: EventRow[];
  /** Controlled by the dashboard so clicking a lane bar above filters here. */
  lane: string; setLane: (l: string) => void;
  /** Set when a day in the trend is clicked — shows only cases that ran then. */
  day?: string;
  /** The server's read time, so age is computed without Date.now() in render. */
  now?: string;
}) {
  const initial = typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const [q, setQ] = useState(() => initial.get("q") ?? "");
  const [onlyUnresolved, setOnlyUnresolved] = useState(() => initial.get("unresolved") === "true");
  const [onlyQuarantined, setOnlyQuarantined] = useState(() => initial.get("quarantined") === "true");
  const [open, setOpen] = useState<CaseRow | null>(null);
  const [sort, setSort] = useState<{ col: SortCol; dir: 1 | -1 }>(() => {
    const [col, dir] = (initial.get("sort") ?? "").split(":");
    return col ? { col: col as SortCol, dir: dir === "-1" ? -1 : 1 } : { col: "tc_id", dir: 1 };
  });
  const [limit, setLimit] = useState(120);
  const sentinel = useRef<HTMLTableRowElement>(null);

  // Keep the filters in the URL so a view can be bookmarked or pasted to
  // someone — "the 399 browser cases with a target" should be a link, not a
  // set of clicks to repeat. replaceState avoids filling the back button.
  useEffect(() => {
    const u = new URL(window.location.href);
    const set = (k: string, v: string | boolean) =>
      v ? u.searchParams.set(k, String(v)) : u.searchParams.delete(k);
    set("lane", lane);
    set("q", q);
    set("unresolved", onlyUnresolved);
    set("quarantined", onlyQuarantined);
    set("sort", sort.col === "tc_id" && sort.dir === 1 ? "" : `${sort.col}:${sort.dir}`);
    window.history.replaceState(null, "", u.toString());
  }, [lane, q, onlyUnresolved, onlyQuarantined, sort]);

  // Reset the window when the filters change, the React-documented way: adjust
  // state during render rather than in an effect, so there is no extra pass.
  const filterSig = `${lane}|${q}|${onlyUnresolved}|${onlyQuarantined}|${day ?? ""}`;
  const [prevSig, setPrevSig] = useState(filterSig);
  if (filterSig !== prevSig) {
    setPrevSig(filterSig);
    setLimit(120);
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = cases.filter((c) => {
      if (lane && c.lane !== lane) return false;
      if (day && (c.last_run_at ?? "").slice(0, 10) !== day) return false;
      if (onlyUnresolved && c.target_url) return false;
      if (onlyQuarantined && !c.quarantined) return false;
      if (!needle) return true;
      // Search the case BODY too — "upload" or "sidebar" finds the relevant
      // cases even when the title does not contain the word.
      return c.tc_id.toLowerCase().includes(needle)
        || (c.test_name ?? "").toLowerCase().includes(needle)
        || (c.source_file ?? "").toLowerCase().includes(needle)
        || (c.steps ?? "").toLowerCase().includes(needle)
        || (c.expected ?? "").toLowerCase().includes(needle)
        || (c.hint ?? "").toLowerCase().includes(needle);
    });
    return [...filtered].sort((a, b) => {
      const r = sortKey(a, sort.col).localeCompare(sortKey(b, sort.col));
      return r * sort.dir;
    });
  }, [cases, lane, q, onlyUnresolved, onlyQuarantined, day, sort]);

  // Grow the window as the last row comes into view, instead of making the
  // reader scroll to the bottom and then click. The DOM still never holds all
  // 1,795 rows at once.

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setLimit((n) => n + 200);
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [rows.length, limit]);

  /** Export what is filtered, not the whole table — the point is to take a
   *  working subset (say, the browser cases with a target) into a plan. */
  const exportCsv = () => {
    const cols = ["tc_id", "source_file", "lane", "ready", "target_url",
      "resolve_method", "spec_path", "last_verdict", "test_name"] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))]
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `testops-${lane || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 11px", borderRadius: 999, fontSize: 12.5, cursor: "pointer",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
    color: active ? "var(--text)" : "var(--text2)",
  });

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} id="testops-q"
          placeholder="Search id, name, file, steps…" style={{
            flex: "1 1 220px", minWidth: 0, padding: "7px 12px", fontSize: 13,
            borderRadius: 999, border: "1px solid var(--border)",
            background: "var(--bg-glass, transparent)", color: "var(--text)",
          }} />
        <button style={btn(!lane)} onClick={() => setLane("")}>All</button>
        {LANES.map((l) => (
          <button key={l} style={{ ...btn(lane === l), borderColor: lane === l ? laneColor(l) : "var(--border)" }}
            onClick={() => setLane(lane === l ? "" : l)}>{l}</button>
        ))}
        <button style={btn(onlyUnresolved)} onClick={() => setOnlyUnresolved((v) => !v)}>
          Unresolved only
        </button>
        <button style={btn(onlyQuarantined)} onClick={() => setOnlyQuarantined((v) => !v)}>
          Quarantined
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "0 0 10px" }}>
        <p style={{ fontSize: 12.5, color: "var(--text3)", margin: 0 }}>
          {rows.length.toLocaleString()} case{rows.length === 1 ? "" : "s"}
          {rows.length > limit ? ` · showing ${limit}` : ""}
        </p>
        <button onClick={exportCsv} disabled={!rows.length} style={{
          background: "transparent", border: "1px solid var(--border)", borderRadius: 999,
          color: "var(--text2)", cursor: rows.length ? "pointer" : "default",
          padding: "4px 12px", fontSize: 12, whiteSpace: "nowrap",
        }}>Export CSV</button>
      </div>

      <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto", overscrollBehavior: "contain" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{
              textAlign: "left", color: "var(--text3)", fontSize: 11.5,
              textTransform: "uppercase", letterSpacing: ".04em",
              position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1,
            }}>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => setSort((s0) =>
                  s0.col === col.key ? { col: col.key, dir: s0.dir === 1 ? -1 : 1 }
                    : { col: col.key, dir: 1 })}
                  aria-sort={sort.col === col.key
                    ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  style={{ padding: "6px 8px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {col.label}
                  <span style={{ opacity: sort.col === col.key ? 1 : 0.25, marginLeft: 4 }}>
                    {sort.col === col.key && sort.dir === -1 ? "\u25B2" : "\u25BC"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((c) => (
              <tr key={c.tc_id} onClick={() => setOpen(c)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setOpen(c); }}
                style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                <td style={{ padding: "8px", fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{c.tc_id}</td>
                <td style={{ padding: "8px", color: "var(--text)", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.test_name}</td>
                <td style={{ padding: "8px" }}>{c.lane && <Chip text={c.lane} color={laneColor(c.lane)} />}</td>
                <td style={{ padding: "8px", fontSize: 12, color: c.target_url ? "var(--text2)" : "var(--text3)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.target_url ? c.target_url.replace(/^https?:\/\//, "") : "unresolved"}
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  {c.last_verdict
                    ? <Chip text={c.last_verdict} color={VERDICT_COLOR[c.last_verdict] ?? "#64748b"} />
                    : <span style={{ color: "var(--text3)", fontSize: 12 }}>never run</span>}
                  {c.quarantined && <> <Chip text="QUARANTINED" color="#a78bfa" title={c.quarantined.why} /></>}
                </td>
                <td style={{
                  padding: "8px", fontSize: 12, whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  color: c.red_since ? VERDICT_COLOR.BUG : "var(--text3)",
                }} title={c.red_since ? "how long this has been failing" : "last run"}>
                  {age(c.red_since ?? c.last_run_at, now) ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length > limit && (
              <tr ref={sentinel}>
                <td colSpan={6} style={{
                  padding: "14px 8px", textAlign: "center", fontSize: 12.5,
                  color: "var(--text3)",
                }}>
                  loading {Math.min(200, rows.length - limit)} more…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <Detail row={open} events={events} onClose={() => setOpen(null)} />}
    </>
  );
}
