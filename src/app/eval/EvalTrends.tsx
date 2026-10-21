"use client";

import { Panel } from "./charts/Panel";
import LineChart from "./charts/LineChart";
import { C, PRIMARY, usd, ms, mmdd } from "./charts/format";

/** Cost-per-day and p95-latency-per-day, drawn from the same daily series as the
 * calls chart. One linear scale each, soft area fill, hover crosshair + tooltip.
 * A gap day (no calls) breaks the line rather than inventing a value. Content-free. */

export interface Day { date: string; calls: number; errors: number; cost_usd: number; p95_ms: number | null }

export default function EvalTrends({ daily }: { daily: Day[] }) {
  const x = daily.map((d) => mmdd(d.date));
  const costVals = daily.map((d) => (d.calls > 0 ? d.cost_usd : null));
  const latVals = daily.map((d) => d.p95_ms);
  const peak = (vals: (number | null)[]) => { const nums = vals.filter((v): v is number => v != null); return nums.length ? Math.max(...nums) : null; };
  const pk = peak(costVals), pl = peak(latVals);

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
      <Panel title="Cost per day" info="Estimated USD spent on LLM calls each day. Free-tier providers are a real $0, so a flat line is normal; a spike is worth a look."
        right={<span style={{ fontSize: 12, color: C.text3, fontVariantNumeric: "tabular-nums" }}>peak {pk == null ? "—" : usd(pk)}</span>}>
        <LineChart series={[{ name: "cost", color: PRIMARY, values: costVals }]} xLabels={x} yFormat={usd} area height={150} />
      </Panel>
      <Panel title="p95 latency per day" info="95th-percentile round-trip time each day — catches a latency regression that an average would hide."
        right={<span style={{ fontSize: 12, color: C.text3, fontVariantNumeric: "tabular-nums" }}>peak {pl == null ? "—" : ms(pl)}</span>}>
        <LineChart series={[{ name: "p95", color: PRIMARY, values: latVals }]} xLabels={x} yFormat={(v) => ms(v)} area height={150} />
      </Panel>
    </div>
  );
}
