"use client";

const TOOL_NAMES: Record<string, string> = {
  "ml-unified": "ML Unified",
  "eda":        "EDA Explorer",
  "vision":     "ML Vision",
};

// Colors from registry.json — must match homepage ProjectCards
const TOOL_COLORS: Record<string, string> = {
  "ml-unified": "#e879f9",
  "eda":        "#34d399",
  "vision":     "#a78bfa",
};

const TOOL_ORDER = ["ml-unified", "eda", "vision"];

const ACTION_LABELS: Record<string, string> = {
  other:        "Panel Opens",
  upload_csv:   "CSV Upload",
  upload:       "CSV Upload",
  upload_image: "Image Upload",
  analyze:      "Analyze",
  clean:        "Clean",
  chart:        "Chart",
  predict:      "Predict",
  train:        "Train",
  shap:         "SHAP",
  automl:       "AutoML",
  cluster:      "Cluster",
  classify:     "Classify",
  detect:       "Detect",
  segment:      "Segment",
};

function labelAction(a: string): string {
  return ACTION_LABELS[a] ?? (a.charAt(0).toUpperCase() + a.slice(1));
}

interface HFToolsProps {
  hfTools: Record<string, Record<string, number>>;
}

function ToolCard({ tool, actions }: { tool: string; actions: Record<string, number> }) {
  const name  = TOOL_NAMES[tool] ?? tool;
  const color = TOOL_COLORS[tool] ?? "#6b7280";
  const total = Object.values(actions).reduce((s, n) => s + n, 0);

  const sorted   = Object.entries(actions).sort(([, a], [, b]) => b - a);
  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Header with color tint */}
      <div className="px-4 pt-4 pb-3" style={{ background: `${color}08` }}>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.12em] block mb-2"
          style={{ color: `${color}cc` }}
        >
          {name}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[2rem] font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-600 font-medium">events</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `${color}18` }} />

      {/* Action breakdown */}
      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        {sorted.length === 0 ? (
          <p className="text-[10px] text-gray-700 italic">no actions yet</p>
        ) : (
          sorted.map(([action, count]) => {
            const pct      = total > 0 ? Math.round((count / total) * 100) : 0;
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={action}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-400">{labelAction(action)}</span>
                  <span className="text-[10px] tabular-nums">
                    <span className="font-semibold text-gray-300">{count}</span>
                    <span className="text-gray-600 ml-1">{pct}%</span>
                  </span>
                </div>
                <div
                  className="h-[3px] rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${barWidth}%`, background: color, opacity: 0.72 }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AnalyticsHFTools({ hfTools }: HFToolsProps) {
  const activeTools = TOOL_ORDER.filter(
    t => Object.keys(hfTools[t] ?? {}).length > 0
  );

  const totals = TOOL_ORDER.reduce<Record<string, number>>((acc, tool) => {
    acc[tool] = Object.values(hfTools[tool] ?? {}).reduce((s, n) => s + n, 0);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
        HF Space Tools
      </p>

      {/* Summary chips */}
      {activeTools.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {TOOL_ORDER.map(tool => {
            const color = TOOL_COLORS[tool] ?? "#6b7280";
            const total = totals[tool];
            if (total === 0) return null;
            return (
              <div
                key={tool}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: `${color}0e`, border: `1px solid ${color}28` }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-[10px] font-semibold text-gray-400">
                  {TOOL_NAMES[tool]}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeTools.length === 0 ? (
        <p className="text-[10px] text-gray-600">No HF Space activity in this period</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeTools.map(tool => (
            <ToolCard key={tool} tool={tool} actions={hfTools[tool] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}