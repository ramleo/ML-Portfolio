"use client";

import { useEffect, useState } from "react";

/** Q4 M1 (feature A) — slide-over that lists the individual calls behind a
 * breakdown bar or an error cluster. Content-free: times, latency, cost, status
 * and the provider's own error text — never prompt or document content. */

export interface CallFilter {
  /** which column is being drilled into, and its value (omitted for "all errors") */
  key?: "tool" | "provider" | "model" | "status";
  value?: string;
  /** status=error with no key → "show every failure" */
  onlyErrors?: boolean;
  days: number;
  title: string;
}

interface Call {
  ts: string | null; tool: string | null; provider: string | null; model: string | null;
  status: string | null; latency_ms: number | null; cost_usd: number | null;
  http_status: number | null; error_code: string | null; error_message: string | null;
  run_id: string | null;
}

const ERR = "#f87171";
const ms = (x: number | null) => (x == null ? "—" : x >= 1000 ? `${(x / 1000).toFixed(1)}s` : `${Math.round(x)}ms`);
const usd = (x: number | null) => (x == null ? "—" : x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
const when = (ts: string | null) => (ts ? ts.slice(0, 16).replace("T", " ") : "—");

export default function EvalCallDrawer({ filter, onClose }: { filter: CallFilter; onClose: () => void }) {
  const [rows, setRows] = useState<Call[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ days: String(filter.days), limit: "100" });
    if (filter.key && filter.value !== undefined) p.set(filter.key, filter.value);
    if (filter.onlyErrors) p.set("status", "error");
    let active = true;
    (async () => {
      setRows(null); setFailed(false);
      try {
        const res = await fetch(`/api/eval/calls?${p}`, { cache: "no-store" });
        const d = res.ok ? await res.json() : null;
        if (!active) return;
        if (d) setRows(d.rows as Call[]); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [filter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const th: React.CSSProperties = { textAlign: "left", padding: "7px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", position: "sticky", top: 0, background: "var(--bg-card)", borderBottom: "1px solid var(--border2)" };
  const td: React.CSSProperties = { padding: "7px 10px", fontSize: 12.5, borderBottom: "1px solid var(--border)", verticalAlign: "top", fontVariantNumeric: "tabular-nums" };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(760px, 94vw)", height: "100%", background: "var(--bg-card)", borderLeft: "1px solid var(--border2)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border2)" }}>
          <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: 0, color: "var(--text)" }}>
            {filter.title}
            {rows && <span style={{ color: "var(--text3)", fontWeight: 400 }}> · {rows.length}{rows.length === 100 ? "+" : ""} calls</span>}
          </h3>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", padding: "4px 10px", fontSize: 13 }}>Esc ✕</button>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>
          {failed ? <p style={{ padding: 20, color: ERR, fontSize: 13 }}>Couldn&apos;t load calls.</p>
            : rows === null ? <p style={{ padding: 20, color: "var(--text2)", fontSize: 13 }}>Loading…</p>
            : rows.length === 0 ? <p style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No calls match.</p>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><th style={th}>When (UTC)</th><th style={th}>Tool</th><th style={th}>Provider / model</th><th style={th}>Status</th><th style={th}>Latency</th><th style={th}>Cost</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const bad = r.status !== "ok";
                    return (
                      <tr key={i}>
                        <td style={{ ...td, whiteSpace: "nowrap", fontFamily: "var(--type-mono, monospace)" }}>{when(r.ts)}</td>
                        <td style={td}>{r.tool || "—"}</td>
                        <td style={td}>{r.provider || "—"}<br /><span style={{ color: "var(--text3)", fontSize: 11.5 }}>{r.model || ""}</span></td>
                        <td style={td}>
                          <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: bad ? "#fff" : "var(--text2)", background: bad ? ERR : "var(--bg)" }}>
                            {bad ? (r.error_code || (r.http_status ? `HTTP ${r.http_status}` : "error")) : "ok"}
                          </span>
                          {bad && r.error_message && <div style={{ marginTop: 4, color: "var(--text3)", fontSize: 11.5, maxWidth: 260, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.error_message}</div>}
                        </td>
                        <td style={td}>{ms(r.latency_ms)}</td>
                        <td style={td}>{usd(r.cost_usd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}
