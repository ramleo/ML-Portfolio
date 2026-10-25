"use client";
import { laneColor, VERDICT_COLOR } from "./testopsCharts";
import type { CaseRow } from "./types";

/** What to do next, not just what the numbers are.
 *
 * A dashboard that only reports counts leaves the reader to work out the action.
 * Each row here is a thing that can be acted on, worst first, and clicking one
 * filters the registry below to exactly those cases. */

type Item = {
  key: string;
  label: string;
  n: number;
  why: string;
  color: string;
  lane?: string;
};

function build(cases: CaseRow[]): Item[] {
  const red = cases.filter((c) => c.last_verdict === "STILL_RED" || c.last_verdict === "BUG");
  const browser = cases.filter((c) => c.lane === "BROWSER");
  const noUrl = browser.filter((c) => !c.target_url);
  const unknown = cases.filter((c) => c.lane === "UNKNOWN");
  const readyNotBuilt = browser.filter((c) => c.target_url && !c.spec_path);
  const regressed = cases.filter((c) => (c.fail_count ?? 0) > 0 && c.last_verdict === "PASS");
  const parked = cases.filter((c) => c.quarantined);

  return ([
    {
      key: "red", label: "Failing", n: red.length, color: VERDICT_COLOR.BUG,
      why: "A real finding or a broken test — triage before anything else.",
    },
    {
      key: "ready", label: "Ready to automate", n: readyNotBuilt.length, color: VERDICT_COLOR.PASS,
      lane: "BROWSER",
      why: "Browser cases with a resolved target and no spec yet. The cheapest coverage available.",
    },
    {
      key: "nourl", label: "Blocked on a URL", n: noUrl.length, color: "#f59e0b", lane: "BROWSER",
      why: "Browser cases that name no page, so nothing can be authored for them yet.",
    },
    {
      key: "unknown", label: "Unclassified", n: unknown.length, color: laneColor("UNKNOWN"),
      lane: "UNKNOWN",
      why: "The classifier could not place these. Left honest rather than force-assigned.",
    },
    {
      key: "parked", label: "Quarantined", n: parked.length, color: "#a78bfa",
      why: "Knowingly parked. Review these — a quarantine with no exit date is just a hidden failure.",
    },
    {
      key: "flaky", label: "Passed after failing", n: regressed.length, color: "#38bdf8",
      why: "Green now but has failed before — the usual shape of a flaky test.",
    },
  ] as Item[]).filter((i) => i.n > 0);
}

export default function NeedsAttention({ cases, onFocusLane }:
  { cases: CaseRow[]; onFocusLane: (lane: string) => void }) {
  const items = build(cases);
  if (!items.length) return null;

  return (
    <section style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-card)", padding: "18px 20px",
    }}>
      <h2 style={{
        font: "600 13px/1.3 var(--type-body, inherit)", letterSpacing: ".04em",
        textTransform: "uppercase", color: "var(--text3)", margin: "0 0 2px",
      }}>Needs attention</h2>
      <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "0 0 14px" }}>
        Worst first. Click one to filter the registry below.
      </p>

      <div style={{
        display: "grid", gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      }}>
        {items.map((i) => (
          <button key={i.key} onClick={() => i.lane && onFocusLane(i.lane)}
            disabled={!i.lane}
            title={i.lane ? `Filter the registry to ${i.lane}` : undefined}
            style={{
              textAlign: "left", padding: "12px 14px", minWidth: 0,
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              borderLeft: `3px solid ${i.color}`,
              background: "transparent", color: "inherit",
              cursor: i.lane ? "pointer" : "default", font: "inherit",
            }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                font: "600 21px/1 var(--type-data, var(--font-mono, monospace))",
                color: i.color, fontVariantNumeric: "tabular-nums",
              }}>{i.n.toLocaleString()}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{i.label}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "6px 0 0", lineHeight: 1.5 }}>
              {i.why}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
