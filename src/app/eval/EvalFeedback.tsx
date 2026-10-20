"use client";

import { useEffect, useState } from "react";

/** Q4 (Portkey-style feedback) — owner view of visitor thumbs on chat answers
 * (/api/eval/feedback): satisfaction, up/down counts, per-model split. A live
 * quality signal alongside the golden-set eval. */

interface Fb {
  needs_setup?: boolean; total: number; up: number; down: number; satisfaction: number | null;
  byModel: { name: string; up: number; down: number; total: number }[];
}

const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: "18px 20px" };
const GOOD = "#34d399", BAD = "#f87171";
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function EvalFeedback({ days }: { days: number }) {
  const [d, setD] = useState<Fb | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setD(null); setFailed(false);
      try {
        const res = await fetch(`/api/eval/feedback?days=${days}`, { cache: "no-store" });
        if (!active) return;
        if (res.ok) setD(await res.json()); else setFailed(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; };
  }, [days]);

  if (failed) return <div style={card}><p style={{ fontSize: 13, color: BAD, margin: 0 }}>Couldn&apos;t load feedback.</p></div>;
  if (!d) return <div style={card}><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></div>;

  return (
    <div style={card}>
      <h3 style={{ fontFamily: "var(--type-display)", fontSize: 15, margin: "0 0 6px", color: "var(--text)" }}>User feedback <span style={{ color: "var(--text3)", fontWeight: 400 }}>· thumbs on chat answers</span></h3>
      <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "0 0 14px" }}>Visitors rate answers 👍/👎 in the chat; this is the live satisfaction signal (content-free — no question or answer stored).</p>
      {d.needs_setup ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up — run <code>supabase/answer_feedback.sql</code>.</p>
        : d.total === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No feedback yet — ratings appear as visitors use the chat.</p>
        : (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 4px" }}>Satisfaction</p>
                <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{pct(d.satisfaction)}</p>
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                <span style={{ color: GOOD, fontWeight: 600 }}>▲ {d.up}</span> &nbsp; <span style={{ color: BAD, fontWeight: 600 }}>▼ {d.down}</span>
                <span style={{ color: "var(--text3)" }}> &nbsp;· {d.total} ratings</span>
              </div>
            </div>
            {d.byModel.length > 1 && (
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: 0 }}>By model</p>
                {d.byModel.map((m) => (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                    <span style={{ width: 150, color: "var(--text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                    <span style={{ flex: 1, height: 9, background: BAD, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                      <span style={{ width: `${m.total ? (m.up / m.total) * 100 : 0}%`, background: GOOD }} />
                    </span>
                    <span style={{ width: 70, textAlign: "right", color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{pct(m.total ? m.up / m.total : null)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
    </div>
  );
}
