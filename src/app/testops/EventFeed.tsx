"use client";
import { useMemo, useState } from "react";
import type { EventRow } from "./types";

/** The recorded history. `kind` is open-ended by design — the table takes any
 *  kind with a JSONB payload — so this renders whatever arrives rather than
 *  switching on a fixed list. A new kind shows up here with no code change. */

const KIND_COLOR: Record<string, string> = {
  run_verdict: "#38bdf8",
  finding: "#f43f5e",
  cost: "#f59e0b",
  decision: "#a78bfa",
  sync: "#94a3b8",
};
const kindColor = (k: string) => KIND_COLOR[k] ?? "#64748b";

/** One line of plain English per event, falling back to compact JSON for a kind
 *  this component has never seen. */
function summarise(e: EventRow): string {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const s = (k: string) => (p[k] === undefined || p[k] === null ? "" : String(p[k]));
  switch (e.kind) {
    case "run_verdict":
      return [s("verdict"), s("provider") && `via ${s("provider")}`,
        Number(p.heals) ? `${s("heals")} heal(s)` : "", s("error")].filter(Boolean).join(" · ");
    case "finding":
      return [s("severity")?.toUpperCase(), s("title"), s("status") && `(${s("status")})`]
        .filter(Boolean).join(" · ");
    case "cost":
      return [s("provider"), s("model"),
        p.tokens_in || p.tokens_out ? `${s("tokens_in")}→${s("tokens_out")} tok` : "",
        p.usd ? `$${s("usd")}` : "", s("quota_note")].filter(Boolean).join(" · ");
    case "decision":
      return [s("what"), s("why") && `— ${s("why")}`].filter(Boolean).join(" ");
    case "sync":
      return [`${s("total")} cases`, p.preserved ? `${s("preserved")} preserved` : ""]
        .filter(Boolean).join(" · ");
    default: {
      const json = JSON.stringify(p);
      return json.length > 140 ? `${json.slice(0, 140)}…` : json;
    }
  }
}

export default function EventFeed({ events }: { events: EventRow[] }) {
  const [kind, setKind] = useState("");
  const kinds = useMemo(
    () => [...new Set(events.map((e) => e.kind))].sort(), [events]);
  const rows = useMemo(
    () => (kind ? events.filter((e) => e.kind === kind) : events).slice(0, 60),
    [events, kind]);

  if (!events.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--text3)", margin: "16px 0", lineHeight: 1.6 }}>
        Nothing recorded yet. Runs, findings, cost and decisions all land here once the
        pipeline starts writing <code>testops_events</code>.
      </p>
    );
  }

  const chip = (active: boolean, c: string): React.CSSProperties => ({
    padding: "4px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer",
    border: `1px solid ${active ? c : "var(--border)"}`,
    background: active ? `color-mix(in srgb, ${c} 16%, transparent)` : "transparent",
    color: active ? "var(--text)" : "var(--text2)",
  });

  return (
    <>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        <button style={chip(!kind, "var(--accent)")} onClick={() => setKind("")}>All</button>
        {kinds.map((k) => (
          <button key={k} style={chip(kind === k, kindColor(k))}
            onClick={() => setKind(kind === k ? "" : k)}>{k}</button>
        ))}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
        {rows.map((e) => (
          <li key={e.id} style={{
            display: "grid", gridTemplateColumns: "9px 118px 1fr auto", gap: 10,
            alignItems: "baseline", padding: "7px 2px",
            borderTop: "1px solid var(--border)",
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: 3, background: kindColor(e.kind),
              alignSelf: "center",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>{e.kind}</span>
            <span style={{ fontSize: 12.5, color: "var(--text2)", minWidth: 0, overflowWrap: "anywhere" }}>
              {e.tc_id && (
                <code style={{ color: "var(--text3)", marginRight: 7, fontSize: 11.5 }}>{e.tc_id}</code>
              )}
              {summarise(e)}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--text3)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              {e.ts?.slice(5, 16).replace("T", " ")}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
