"use client";
import { useMemo, useState } from "react";
import { laneColor, VERDICT_COLOR } from "./testopsCharts";
import type { CaseRow, EventRow } from "./types";

/** The registry itself: every documented case, filterable, with a drill-down
 *  panel showing the full case text, what it resolved to, and its history. */

const LANES = ["BROWSER", "API", "REPO", "LESSON", "UNKNOWN", "DEAD"];

function Chip({ text, color, title }: { text: string; color: string; title?: string }) {
  return (
    <span title={title} style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11,
      fontWeight: 600, letterSpacing: ".02em", color,
      background: `color-mix(in srgb, ${color} 16%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 36%, transparent)`,
      whiteSpace: "nowrap",
    }}>{text}</span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase",
        color: "var(--text3)", fontWeight: 600, marginBottom: 3,
      }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {children}
      </div>
    </div>
  );
}

function Detail({ row, events, onClose }:
  { row: CaseRow; events: EventRow[]; onClose: () => void }) {
  const mine = events.filter((e) => e.tc_id === row.tc_id);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120, display: "flex", justifyContent: "flex-end",
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} style={{
        width: "min(560px, 100%)", height: "100%", overflowY: "auto",
        background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
        padding: "26px 24px 60px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
          <div>
            <div style={{ font: "600 15px/1.3 var(--font-mono, monospace)", color: "var(--text)" }}>
              {row.tc_id}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 2 }}>
              {row.source_file}{row.source_part ? ` · ${row.source_part}` : ""}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text2)", cursor: "pointer", padding: "4px 10px", fontSize: 13,
          }}>Close</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0 20px" }}>
          {row.lane && <Chip text={row.lane} color={laneColor(row.lane)} />}
          {row.ready && <Chip text={row.ready} color="#94a3b8" />}
          {row.last_verdict && (
            <Chip text={row.last_verdict} color={VERDICT_COLOR[row.last_verdict] ?? "#64748b"} />
          )}
          {row.lane_locked && <Chip text="LOCKED" color="#a78bfa" title="Classification corrected by hand — sync will not change it" />}
        </div>

        <Field label="Test name">{row.test_name}</Field>
        <Field label="Steps">{row.steps}</Field>
        <Field label="Expected result">{row.expected}</Field>
        <Field label="Automation hint">{row.hint}</Field>
        <Field label="Resolved target">
          {row.target_url
            ? <>{row.target_url}<span style={{ color: "var(--text3)" }}> · via {row.resolve_method}</span></>
            : <span style={{ color: "var(--text3)" }}>unresolved — no URL could be derived from the case text</span>}
        </Field>
        <Field label="Spec">{row.spec_path ?? <span style={{ color: "var(--text3)" }}>not authored yet</span>}</Field>

        <div style={{
          fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase",
          color: "var(--text3)", fontWeight: 600, margin: "22px 0 8px",
        }}>History</div>
        {mine.length === 0
          ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Nothing recorded for this case yet.</p>
          : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {mine.map((e) => (
                <li key={e.id} style={{
                  border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                  padding: "8px 11px", fontSize: 12.5, color: "var(--text2)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong style={{ color: "var(--text)" }}>{e.kind}</strong>
                    <span style={{ color: "var(--text3)" }}>{e.ts?.slice(0, 16).replace("T", " ")}</span>
                  </div>
                  <pre style={{
                    margin: "5px 0 0", fontSize: 11.5, whiteSpace: "pre-wrap",
                    color: "var(--text3)", fontFamily: "var(--font-mono, monospace)",
                  }}>{JSON.stringify(e.payload, null, 1)}</pre>
                </li>
              ))}
            </ul>
          )}
      </aside>
    </div>
  );
}

export default function CaseTable({ cases, events, lane, setLane }: {
  cases: CaseRow[]; events: EventRow[];
  /** Controlled by the dashboard so clicking a lane bar above filters here. */
  lane: string; setLane: (l: string) => void;
}) {
  const [q, setQ] = useState("");
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [open, setOpen] = useState<CaseRow | null>(null);
  const [limit, setLimit] = useState(60);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cases.filter((c) => {
      if (lane && c.lane !== lane) return false;
      if (onlyUnresolved && c.target_url) return false;
      if (!needle) return true;
      return c.tc_id.toLowerCase().includes(needle)
        || (c.test_name ?? "").toLowerCase().includes(needle)
        || (c.source_file ?? "").toLowerCase().includes(needle);
    });
  }, [cases, lane, q, onlyUnresolved]);

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
          placeholder="Search id, name or file…" style={{
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
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "0 0 10px" }}>
        {rows.length.toLocaleString()} case{rows.length === 1 ? "" : "s"}
        {rows.length > limit ? ` · showing ${limit}` : ""}
      </p>

      <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto", overscrollBehavior: "contain" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{
              textAlign: "left", color: "var(--text3)", fontSize: 11.5,
              textTransform: "uppercase", letterSpacing: ".04em",
              position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1,
            }}>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>ID</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Test name</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Lane</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Target</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>Verdict</th>
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
                <td style={{ padding: "8px" }}>
                  {c.last_verdict
                    ? <Chip text={c.last_verdict} color={VERDICT_COLOR[c.last_verdict] ?? "#64748b"} />
                    : <span style={{ color: "var(--text3)", fontSize: 12 }}>never run</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > limit && (
        <button onClick={() => setLimit((n) => n + 120)} style={{
          marginTop: 14, padding: "7px 16px", borderRadius: 999, cursor: "pointer",
          border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 13,
        }}>Show more</button>
      )}

      {open && <Detail row={open} events={events} onClose={() => setOpen(null)} />}
    </>
  );
}
