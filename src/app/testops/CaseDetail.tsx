"use client";
import { useEffect, useRef } from "react";
import { laneColor, VERDICT_COLOR } from "./testopsCharts";
import type { CaseRow, EventRow } from "./types";

/** The slide-over for one case: its full text, what it resolved to, why it
 *  last failed, and its recorded history. */

export function Chip({ text, color, title }: { text: string; color: string; title?: string }) {
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

export function Detail({ row, events, onClose }:
  { row: CaseRow; events: EventRow[]; onClose: () => void }) {
  const mine = events.filter((e) => e.tc_id === row.tc_id);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // The drawer had no keyboard exit and no dialog semantics — a keyboard user
  // could open it and not get out. Escape closes it, focus moves in on open and
  // returns to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120, display: "flex", justifyContent: "flex-end",
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={`Test case ${row.tc_id}`} style={{
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
          <button ref={closeBtn} onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text2)", cursor: "pointer", padding: "4px 10px", fontSize: 13,
          }}>Close (Esc)</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0 20px" }}>
          {row.lane && <Chip text={row.lane} color={laneColor(row.lane)} />}
          {row.ready && <Chip text={row.ready} color="#94a3b8" />}
          {row.last_verdict && (
            <Chip text={row.last_verdict} color={VERDICT_COLOR[row.last_verdict] ?? "#64748b"} />
          )}
          {row.lane_locked && <Chip text="LOCKED" color="#a78bfa" title="Classification corrected by hand — sync will not change it" />}
        </div>

        {row.quarantined && (
          <Field label="Quarantined">
            <span style={{ color: "#a78bfa" }}>{row.quarantined.why || "no reason recorded"}</span>
            {row.quarantined.until && <> · exits when: {row.quarantined.until}</>}
          </Field>
        )}

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

        {(() => {
          const latest = mine.find((e) => e.kind === "run_verdict");
          const reason = (latest?.payload as { reason?: string } | undefined)?.reason;
          if (!reason) return null;
          const bad = row.last_verdict !== "PASS" && row.last_verdict !== "HEALED";
          return (
            <Field label={bad ? "Why it failed" : "Why it is skipped"}>
              <span style={{ color: bad ? VERDICT_COLOR.BUG : "var(--text2)" }}>{reason}</span>
            </Field>
          );
        })()}

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
