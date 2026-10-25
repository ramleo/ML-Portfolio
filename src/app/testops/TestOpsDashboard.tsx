"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Stat, Bars, Trend, Legend, CoverageMeter, laneColor, LANE_COLOR, VERDICT_COLOR }
  from "./testopsCharts";
import CaseTable from "./CaseTable";
import EventFeed from "./EventFeed";
import NeedsAttention from "./NeedsAttention";
import type { TestOpsPayload } from "./types";

const sorted = (o: Record<string, number> | undefined): [string, number][] =>
  Object.entries(o ?? {}).sort((a, b) => b[1] - a[1]);

function Setup({ hint }: { hint?: string }) {
  return (
    <div style={{
      border: "1px dashed var(--border)", borderRadius: "var(--radius-card)",
      padding: "28px 26px", maxWidth: 680,
    }}>
      <h2 style={{ font: "600 17px/1.3 var(--type-display, inherit)", margin: "0 0 8px", color: "var(--text)" }}>
        One-time setup
      </h2>
      <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, margin: "0 0 14px" }}>
        The registry tables do not exist yet. {hint}
      </p>
      <pre style={{
        margin: 0, padding: "12px 14px", borderRadius: "var(--radius-sm)",
        background: "var(--bg-section, rgba(127,127,127,.1))", fontSize: 12.5,
        overflowX: "auto", color: "var(--text2)",
      }}>{`1. Supabase SQL editor → run ML-Unified/supabase/testops.sql
2. cd ML-Unified && .venv/bin/python scripts/testops_sync.py`}</pre>
    </div>
  );
}

export default function TestOpsDashboard() {
  const [data, setData] = useState<TestOpsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Lane filter lives here so clicking a bar above filters the registry below —
  // a chart you can act on beats a chart you can only read.
  const [lane, setLane] = useState("");
  const registry = useRef<HTMLDivElement>(null);
  const focusLane = (l: string) => {
    setLane((cur) => (cur === l ? "" : l));
    registry.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    let alive = true;
    fetch("/api/testops")
      .then((r) => r.json())
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(String(e)); });
    return () => { alive = false; };
  }, []);

  const t = data?.totals;
  const cases = useMemo(() => data?.cases ?? [], [data]);

  return (
    <>
      <header style={{ marginBottom: 26 }}>
        <h1 style={{
          font: "600 30px/1.2 var(--type-display, inherit)", margin: "0 0 6px", color: "var(--text)",
        }}>TestOps</h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
          Every documented test case, what it was sorted into, what it resolves to, and what
          happened when it ran. The markdown files remain the source of truth for a case&apos;s
          text; this holds the state they cannot.
        </p>
        {data?.generatedAt && (
          <p style={{ fontSize: 12, color: "var(--text3)", margin: "8px 0 0" }}>
            Read at {data.generatedAt.slice(0, 16).replace("T", " ")} UTC
          </p>
        )}
      </header>

      {err && <p style={{ color: VERDICT_COLOR.BUG, fontSize: 14 }}>Could not load: {err}</p>}
      {!data && !err && <p style={{ color: "var(--text3)", fontSize: 14 }}>Loading…</p>}
      {data?.needsSetup && <Setup hint={data.hint} />}

      {data && !data.needsSetup && t && (
        <div style={{ display: "grid", gap: 16 }}>

          <div style={{
            display: "grid", gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))",
          }}>
            <Stat label="Documented" value={t.documented} sub="cases in the TC files" />
            <Stat label="Automated" value={t.automated} tone={VERDICT_COLOR.PASS}
              sub="have a generated spec" />
            <Stat label="Resolved" value={t.resolved} tone="#38bdf8"
              sub="a target URL was derived" />
            <Stat label="Ever run" value={t.everRun} sub="executed at least once" />
            <Stat label="Pass rate" value={t.passRate} suffix="%"
              tone={t.passRate !== null && t.passRate >= 95 ? VERDICT_COLOR.PASS : undefined}
              sub={t.everRun ? "of cases that ran" : "nothing has run yet"} />
          </div>

          <NeedsAttention cases={cases} onFocusLane={focusLane} />

          <Card title="Coverage"
            hint="The number this page exists to move — documented cases that have a runnable spec.">
            <CoverageMeter automated={t.automated} documented={t.documented} />
          </Card>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))" }}>
            <Card title="By lane" hint="What kind of test each case needs. Classification is regex over prose and measured at 67% — treat as a starting point.">
              <Bars data={sorted(data.byLane)} color={laneColor} total={t.documented}
                onSelect={focusLane} selected={lane} />
              <Legend items={Object.entries(LANE_COLOR)} />
            </Card>

            <Card title="Browser cases — readiness"
              hint="READY runs as written. NO_URL names no page, so it cannot be authored without a resolver.">
              <Bars data={sorted(data.byReady)} total={data.byLane?.BROWSER} />
            </Card>

            <Card title="URL resolution"
              hint="How each case's target was derived, if at all.">
              <Bars data={sorted(data.byResolve)} total={t.documented} />
            </Card>

            <Card title="Verdicts" hint="Latest outcome per case that has run.">
              {sorted(data.byVerdict).length
                ? <Bars data={sorted(data.byVerdict)} color={(k) => VERDICT_COLOR[k] ?? "#64748b"} />
                : <p style={{ fontSize: 13, color: "var(--text3)", margin: "18px 0" }}>
                    No case has run yet.
                  </p>}
            </Card>
          </div>

          <Card title="Outcomes over time"
            hint="Pass and fail per day. A single snapshot hides regressions.">
            <Trend series={data.series ?? []} />
            <Legend items={[["passed", VERDICT_COLOR.PASS], ["failed", VERDICT_COLOR.BUG]]} />
          </Card>

          <Card title="Source files" hint="Where the cases come from.">
            <Bars data={sorted(data.byFile).slice(0, 12)} total={t.documented} />
          </Card>

          <Card title="Activity" scroll={420}
            hint="Everything recorded: run verdicts, findings, cost and quota, decisions. New record kinds need no migration.">
            <EventFeed events={data.events ?? []} />
          </Card>

          <div ref={registry} style={{ scrollMarginTop: 90 }}>
            <Card title="Registry"
              hint="Every case. Click a row for its full text, target and history."
              action={lane
                ? <button onClick={() => setLane("")} style={{
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: 999, color: "var(--text2)", cursor: "pointer",
                    padding: "3px 10px", fontSize: 12,
                  }}>Clear {lane} filter</button>
                : undefined}>
              <CaseTable cases={cases} events={data.events ?? []}
                lane={lane} setLane={setLane} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
