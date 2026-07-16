"use client";

const TOOL_NAMES: Record<string, string> = {
  "automl":              "AutoML",
  "preprocessing":       "Preprocessing",
  "feature-engineering": "Feature Engineering",
  "feature-selection":   "Feature Selection",
  "optuna":              "Optuna Tuner",
  "shap":                "SHAP Explainer",
  "drift":               "Drift Monitor",
  "ensemble":            "Ensemble",
  "text-to-sql":         "Text → SQL",
};

const TOOL_COLORS: Record<string, string> = {
  "automl":              "#22c55e",
  "preprocessing":       "#22d3ee",
  "feature-engineering": "#38bdf8",
  "feature-selection":   "#fb923c",
  "optuna":              "#a78bfa",
  "shap":                "#f59e0b",
  "drift":               "#f97316",
  "ensemble":            "#f472b6",
  "text-to-sql":         "#6366f1",
};

const TOOL_ORDER = [
  "automl", "preprocessing", "feature-engineering", "feature-selection",
  "optuna", "shap", "drift", "ensemble", "text-to-sql",
];

const ACTION_LABELS: Record<string, string> = {
  upload_csv:         "CSV Upload",
  upload:             "CSV Upload",
  apply_transforms:   "Apply Transforms",
  run_selection:      "Run Selection",
  selection_complete: "Selection Done",
  preprocess:         "Preprocess",
  download:           "Download",
  pass_to_automl:     "→ AutoML",
  optuna_start:       "Run Started",
  optuna:             "Run Complete",
  optuna_error:       "Error",
  automl_start:       "Run Started",
  automl:             "Run Complete",
  query_run:          "Query",
  train:              "Train",
  analyze:            "Analyze",
};

function labelAction(a: string): string {
  return ACTION_LABELS[a] ?? (a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, " "));
}

interface PortfolioToolsProps {
  portfolioTools: Record<string, Record<string, number>>;
}

function ToolCard({ tool, actions }: { tool: string; actions: Record<string, number> }) {
  const name  = TOOL_NAMES[tool] ?? tool;
  const color = TOOL_COLORS[tool] ?? "#6b7280";
  const total = Object.values(actions).reduce((s, n) => s + n, 0);

  // Filter "other" (bare page-opens from useToolTracking — noise, not signal)
  const meaningful = Object.entries(actions)
    .filter(([a]) => a !== "other")
    .sort(([, a], [, b]) => b - a);

  const maxCount = meaningful[0]?.[1] ?? 1;

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
        {meaningful.length === 0 ? (
          <p className="text-[10px] text-gray-700 italic">no specific actions yet</p>
        ) : (
          meaningful.map(([action, count]) => {
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

export default function AnalyticsPortfolioTools({ portfolioTools }: PortfolioToolsProps) {
  const activeTools = TOOL_ORDER.filter(
    t => Object.keys(portfolioTools[t] ?? {}).length > 0
  );

  const totals = TOOL_ORDER.reduce<Record<string, number>>((acc, tool) => {
    acc[tool] = Object.values(portfolioTools[tool] ?? {}).reduce((s, n) => s + n, 0);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Portfolio Tools
      </p>

      {/* Summary chips — all active tools at a glance */}
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
        <p className="text-[10px] text-gray-600">No portfolio tool activity in this period</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeTools.map(tool => (
            <ToolCard key={tool} tool={tool} actions={portfolioTools[tool] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}