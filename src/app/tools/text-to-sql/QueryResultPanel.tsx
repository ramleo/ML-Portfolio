"use client";

import {
  BarChart, HorizontalBarChart, AreaChart, ScatterChart,
  DonutChart, StatCard, MultiBarChart,
} from "./SqlChart";

const ACCENT = "#6366f1";

const CHART_LABEL: Record<string, string> = {
  bar: "Bar Chart", bar_h: "Horizontal Bar", area: "Area Chart",
  scatter: "Scatter Plot", donut: "Donut Chart", stat: "Result",
  multibar: "Multi-Series Bar", line: "Area Chart",
};

interface Viz {
  chart_type: string;
  labels?: string[];
  values?: number[];
  x_label: string;
  y_label: string;
  x?: number[];
  y?: number[];
  value?: string;
  label?: string;
  series?: { name: string; values: number[] }[];
}

interface Results {
  columns: string[];
  rows: unknown[][];
  count: number;
  exec_time_ms: number;
}

interface Props {
  generatedSql: string | null;
  copied: boolean;
  copySQL: () => void;
  results: Results | null;
  viz: Viz | null;
  explanation: string;
  error: string | null;
}

function formatCell(cell: unknown): string {
  if (cell === null) return "";
  const n = Number(cell);
  if (!isNaN(n) && String(cell).trim() !== "" && String(cell) !== String(Math.round(n))) {
    return n.toFixed(2);
  }
  return String(cell);
}

export default function QueryResultPanel({ generatedSql, copied, copySQL, results, viz, explanation, error }: Props) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {generatedSql && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Generated SQL</span>
            <button onClick={copySQL} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{generatedSql}</pre>
        </div>
      )}

      {results && results.columns.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Results</span>
            <span className="text-[11px] text-gray-500">{results.count} rows · {results.exec_time_ms}ms</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0f0f0f] z-10">
                <tr className="border-b border-white/10">
                  {results.columns.map(c => (
                    <th key={c} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    {(row as unknown[]).map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                        {cell === null
                          ? <span className="text-gray-600">null</span>
                          : formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {results.count >= 500 && (
              <p className="text-[11px] text-amber-400/80 px-4 py-2">
                Results capped at 500 rows — add a LIMIT or WHERE clause to narrow results.
              </p>
            )}
          </div>
        </div>
      )}

      {viz && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          {viz.chart_type !== "stat" && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {CHART_LABEL[viz.chart_type] ?? viz.chart_type}
            </p>
          )}
          {viz.chart_type === "bar" && viz.labels && viz.values && (
            <BarChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
          )}
          {viz.chart_type === "bar_h" && viz.labels && viz.values && (
            <HorizontalBarChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
          )}
          {(viz.chart_type === "area" || viz.chart_type === "line") && viz.labels && viz.values && (
            <AreaChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
          )}
          {viz.chart_type === "scatter" && viz.x && viz.y && (
            <ScatterChart x={viz.x} y={viz.y} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} labels={viz.labels} />
          )}
          {viz.chart_type === "donut" && viz.labels && viz.values && (
            <DonutChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} accent={ACCENT} />
          )}
          {viz.chart_type === "stat" && viz.value != null && (
            <StatCard value={viz.value} label={viz.label ?? viz.x_label} accent={ACCENT} />
          )}
          {viz.chart_type === "multibar" && viz.labels && viz.series && (
            <MultiBarChart labels={viz.labels} series={viz.series} xLabel={viz.x_label} yLabel={viz.y_label} />
          )}
        </div>
      )}

      {explanation && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
        </div>
      )}
    </>
  );
}