"use client";

import { useState } from "react";
import { Panel, Legend } from "./charts/Panel";
import { BarList, type BarDatum } from "./charts/Bars";
import LineChart from "./charts/LineChart";
import { seriesColor, pct0 } from "./charts/format";
import { Radar, Scatter, METRICS, type Run, type ModelPerf } from "./ModelCompareShapes";

export type { ModelPerf } from "./ModelCompareShapes";

/** Compare generation models on the golden set, four ways. Every view is labeled so
 * it's clear which metric it shows (the old "Lines" ambiguity): Bars = per criterion,
 * Lines = pass rate across runs, Radar = all metrics, Scatter = quality vs speed.
 * Color follows the model (stable across views), with a legend + direct labels. */

type View = "bars" | "lines" | "radar" | "scatter";
const CAPTION: Record<View, string> = {
  bars: "Each quality criterion, per model — longer bar is better.",
  lines: "Pass rate (all three criteria met) across each model's runs, oldest → newest. Re-run a model to extend its line.",
  radar: "All four quality metrics per model at once — a bigger shape is better.",
  scatter: "Quality vs speed: pass rate against p95 latency. Top-left is best (accurate and fast).",
};

export default function ModelCompare({ runs, perf = [] }: { runs: Run[]; perf?: ModelPerf[] }) {
  const [view, setView] = useState<View>("bars");

  const done = runs.filter((r) => r.status === "done" && r.gen_model && r.pass_rate != null);
  const models = [...new Set(done.map((r) => r.gen_model as string))].sort();
  const colorOf = (m: string) => seriesColor(m, models);
  const latest = new Map<string, Run>();
  for (const r of done) if (!latest.has(r.gen_model as string)) latest.set(r.gen_model as string, r);

  if (models.length === 0)
    return <Panel title="Model comparison"><p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Run the eval on a model to compare.</p></Panel>;

  const switcher = (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {(["bars", "lines", "radar", "scatter"] as View[]).map((v) => (
        <button key={v} type="button" onClick={() => setView(v)}
          style={{ padding: "0.25rem 0.7rem", fontSize: 12.5, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: view === v ? "var(--accent)" : "transparent", color: view === v ? "#fff" : "var(--text2)" }}>
          {v === "scatter" ? "quality vs speed" : v}
        </button>
      ))}
    </div>
  );

  return (
    <Panel title="Model comparison" sub={CAPTION[view]} right={switcher}>
      <div style={{ marginBottom: 14 }}><Legend items={models.map((m) => ({ label: m, color: colorOf(m) }))} /></div>
      {view === "bars" && <Bars models={models} latest={latest} colorOf={colorOf} />}
      {view === "radar" && <Radar models={models} latest={latest} colorOf={colorOf} />}
      {view === "lines" && <Lines done={done} models={models} colorOf={colorOf} />}
      {view === "scatter" && <Scatter models={models} latest={latest} perf={perf} colorOf={colorOf} />}
    </Panel>
  );
}

function Bars({ models, latest, colorOf }: { models: string[]; latest: Map<string, Run>; colorOf: (m: string) => string }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {METRICS.map((metric) => {
        const items: BarDatum[] = models.map((m) => {
          const v = (latest.get(m)?.[metric.key] as number | null) ?? null;
          return { key: m, label: m, max: 1, segs: [{ value: v ?? 0, color: colorOf(m) }], value: pct0(v) };
        });
        return (
          <div key={metric.key as string}>
            <p style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 8px" }}>{metric.label}</p>
            <BarList items={items} />
          </div>
        );
      })}
    </div>
  );
}

function Lines({ done, models, colorOf }: { done: Run[]; models: string[]; colorOf: (m: string) => string }) {
  // Align every model's runs by ordinal (run 1, 2, …), oldest → newest, padded with
  // null so a model with fewer runs simply has a shorter line.
  const perModel = models.map((m) => done.filter((r) => r.gen_model === m).slice().reverse());
  const maxLen = Math.max(1, ...perModel.map((s) => s.length));
  const series = models.map((m, i) => ({
    name: m, color: colorOf(m),
    values: Array.from({ length: maxLen }, (_, k) => perModel[i][k]?.pass_rate ?? null),
  }));
  const xLabels = Array.from({ length: maxLen }, (_, k) => `run ${k + 1}`);
  return (
    <>
      <LineChart series={series} xLabels={xLabels} yFormat={(v) => pct0(v)} yMax={1} height={210} />
      {maxLen < 2 && <p style={{ fontSize: 12, color: "var(--text3)", margin: "6px 0 0" }}>One run per model so far — each dot is its latest pass rate. Run a model again to draw its trend.</p>}
    </>
  );
}
