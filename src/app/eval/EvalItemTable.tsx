"use client";

import { type ReactNode } from "react";
import { C, PRIMARY } from "./charts/format";

/** Per-item golden-set results for one run, worst-first. Shows the question, an
 * overall Pass/Fail chip, the three judge criteria (Correct / Faithful / Relevant),
 * a groundedness meter, and the judge's note. Owner-only content (the owner's own
 * golden set + the system's answers). */

export interface Score {
  item_id: string; question: string; answer: string | null;
  correct: boolean | null; faithful: boolean | null; relevant: boolean | null;
  groundedness: number | null; rationale: string | null;
}
export const itemPass = (s: Score) => s.correct === true && s.faithful === true && s.relevant === true;

function Mark({ v }: { v: boolean | null }) {
  if (v == null) return <span style={{ color: "var(--text3)" }}>—</span>;
  return v ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.good} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="yes"><path d="M20 6L9 17l-5-5" /></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.err} strokeWidth="3" strokeLinecap="round" aria-label="no"><path d="M6 6l12 12M18 6L6 18" /></svg>
  );
}

function Ground({ v }: { v: number | null }) {
  if (v == null) return <span style={{ color: "var(--text3)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 40, height: 7, background: C.track, borderRadius: 4, overflow: "hidden", display: "inline-block" }}>
        <span style={{ display: "block", width: `${Math.round(v * 100)}%`, height: "100%", background: PRIMARY }} />
      </span>
      <span style={{ color: "var(--text3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(v * 100)}%</span>
    </span>
  );
}

export default function EvalItemTable({ scores, loading, picker, meta }:
  { scores: Score[]; loading: boolean; picker: ReactNode; meta: string }) {
  const th: React.CSSProperties = { textAlign: "left", padding: "7px 10px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 12.5, borderTop: "1px solid var(--border)", verticalAlign: "top" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "4px 0 10px" }}>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)" }}>Per-item results</span>
        {picker}
        <span style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", gap: 12, alignItems: "center", fontSize: 11.5, color: "var(--text3)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mark v /> correct / faithful / relevant</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mark v={false} /> failed</span>
        </span>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text3)", margin: "0 0 8px" }}>{meta}</p>

      {loading ? <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p>
        : scores.length === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No per-item scores for this run.</p>
        : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ ...th, minWidth: 220 }}>Question</th>
                  <th style={th}>Result</th>
                  <th style={{ ...th, textAlign: "center" }} title="Correct">C</th>
                  <th style={{ ...th, textAlign: "center" }} title="Faithful">F</th>
                  <th style={{ ...th, textAlign: "center" }} title="Relevant">R</th>
                  <th style={th}>Groundedness</th>
                  <th style={th}>Judge note</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => {
                  const pass = itemPass(s);
                  return (
                    <tr key={s.item_id}>
                      <td style={{ ...td, maxWidth: 300, color: "var(--text)" }}>{s.question}</td>
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "1px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#fff", background: pass ? C.good : C.err }}>{pass ? "Pass" : "Fail"}</span>
                      </td>
                      <td style={{ ...td, textAlign: "center" }}><Mark v={s.correct} /></td>
                      <td style={{ ...td, textAlign: "center" }}><Mark v={s.faithful} /></td>
                      <td style={{ ...td, textAlign: "center" }}><Mark v={s.relevant} /></td>
                      <td style={td}><Ground v={s.groundedness} /></td>
                      <td style={{ ...td, color: "var(--text3)", maxWidth: 340 }}>{s.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
