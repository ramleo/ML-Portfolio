"use client";

import { useEffect, useState } from "react";
import { Panel } from "./charts/Panel";
import { BarList, type BarDatum } from "./charts/Bars";
import { C, pct0, n } from "./charts/format";

/** Owner view of visitor thumbs on chat answers (/api/eval/feedback): satisfaction,
 * up/down counts, per-model split. A live quality signal alongside the golden-set
 * eval. Content-free — rating + tool/provider/model/session only. */

interface Fb {
  needs_setup?: boolean; total: number; up: number; down: number; satisfaction: number | null;
  byModel: { name: string; up: number; down: number; total: number }[];
}

/** Inline thumb glyph (no emoji). `up` flips it vertically. */
function Thumb({ up, color }: { up: boolean; color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden style={{ transform: up ? "none" : "rotate(180deg)" }}>
      <path d="M2 10h3.5v11H2zM21.8 10.3c-.3-.4-.8-.6-1.3-.6h-5.1l.8-3.8c.1-.5 0-1-.3-1.4-.3-.4-.8-.6-1.3-.6-.5 0-.9.2-1.2.6L8.5 9.6c-.3.4-.5.9-.5 1.4V19c0 .9.7 1.6 1.6 1.6h7.8c.7 0 1.3-.4 1.5-1.1l1.6-6.4c.2-.6.1-1.2-.3-1.7z" />
    </svg>
  );
}

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

  const info = "Visitors rate chat answers thumbs-up / thumbs-down. This is the live satisfaction signal alongside the golden-set score. Content-free — no question or answer stored.";
  if (failed) return <Panel title="User feedback" info={info}><p style={{ fontSize: 13, color: C.err, margin: 0 }}>Couldn&apos;t load feedback.</p></Panel>;
  if (!d) return <Panel title="User feedback" info={info}><p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>Loading…</p></Panel>;

  const byModel: BarDatum[] = d.byModel.filter((m) => m.total > 0).map((m) => ({
    key: m.name, label: m.name, max: m.total,
    segs: [{ value: m.up, color: C.good }, { value: m.down, color: C.err }],
    value: pct0(m.total ? m.up / m.total : null),
    tip: <div><strong style={{ color: "var(--text)" }}>{m.name}</strong><div style={{ color: C.good }}>{m.up} up</div><div style={{ color: C.err }}>{m.down} down</div></div>,
  }));

  return (
    <Panel title="User feedback · thumbs on chat answers" info={info}>
      {d.needs_setup ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Not set up — run <code>supabase/answer_feedback.sql</code>.</p>
        : d.total === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No feedback yet — ratings appear as visitors use the chat.</p>
        : (
          <>
            <div style={{ display: "flex", gap: 26, flexWrap: "wrap", alignItems: "baseline", marginBottom: byModel.length > 1 ? 16 : 0 }}>
              <div>
                <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 5px" }}>Satisfaction</p>
                <p style={{ fontFamily: "var(--type-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>{pct0(d.satisfaction)}</p>
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.good, fontWeight: 600 }}><Thumb up color={C.good} /> {n(d.up)}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.err, fontWeight: 600 }}><Thumb up={false} color={C.err} /> {n(d.down)}</span>
                <span style={{ color: "var(--text3)" }}>· {n(d.total)} ratings</span>
              </div>
            </div>
            {byModel.length > 1 && (
              <>
                <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 8px" }}>Thumbs-up rate by model</p>
                <BarList items={byModel} />
              </>
            )}
          </>
        )}
    </Panel>
  );
}
