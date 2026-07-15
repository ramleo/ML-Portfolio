"use client";

const TOOL_NAMES: Record<string, string> = {
  "automl":               "AutoML",
  "preprocessing":        "Preprocessing",
  "feature-engineering":  "Feature Engineering",
  "feature-selection":    "Feature Selection",
  "optuna":               "Optuna Tuner",
  "shap":                 "SHAP Explainer",
  "drift":                "Drift Monitor",
  "ensemble":             "Ensemble",
  "text-to-sql":          "Text → SQL",
};

const TOOL_COLORS: Record<string, string> = {
  "automl":               "#22c55e",
  "preprocessing":        "#22d3ee",
  "feature-engineering":  "#38bdf8",
  "feature-selection":    "#fb923c",
  "optuna":               "#a78bfa",
  "shap":                 "#f59e0b",
  "drift":                "#f97316",
  "ensemble":             "#f472b6",
  "text-to-sql":          "#6366f1",
};

const TOOL_ORDER = ["automl", "preprocessing", "feature-engineering", "feature-selection", "optuna", "shap", "drift", "ensemble", "text-to-sql"];

const ACTION_LABELS: Record<string, string> = {
  other:              "Opens",
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
};

function labelAction(a: string): string {
  return ACTION_LABELS[a] ?? (a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, " "));
}

interface PortfolioToolsProps {
  portfolioTools: Record<string, Record<string, number>>;
}

export default function AnalyticsPortfolioTools({ portfolioTools }: PortfolioToolsProps) {
  const activeTools = TOOL_ORDER.filter(t => Object.keys(portfolioTools[t] ?? {}).length > 0);

  const totals = TOOL_ORDER.reduce<Record<string, number>>((acc, tool) => {
    acc[tool] = Object.values(portfolioTools[tool] ?? {}).reduce((s, n) => s + n, 0);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
        Portfolio Tools
      </p>

      {/* Overall summary chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TOOL_ORDER.map(tool => {
          const color = TOOL_COLORS[tool] ?? "#6b7280";
          const total = totals[tool];
          if (total === 0) return null;
          return (
            <div
              key={tool}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: `${color}10`, border: `1px solid ${color}25` }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[10px] font-semibold text-gray-400">{TOOL_NAMES[tool]}</span>
              <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{total.toLocaleString()}</span>
              <span className="text-[9px] text-gray-600">events</span>
            </div>
          );
        })}
      </div>

      {activeTools.length === 0 ? (
        <p className="text-[10px] text-gray-600">No portfolio tool activity in this period</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {activeTools.map(tool => {
            const actions = portfolioTools[tool] ?? {};
            const total   = totals[tool];
            const sorted  = Object.entries(actions).sort(([, a], [, b]) => b - a);
            const max     = sorted[0]?.[1] ?? 1;
            const color   = TOOL_COLORS[tool] ?? "#6b7280";

            return (
              <div key={tool} className="pt-4 first:pt-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {TOOL_NAMES[tool] ?? tool}
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums text-gray-600">
                    <span className="font-bold" style={{ color }}>{total.toLocaleString()}</span>
                    <span className="ml-1">total events</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {sorted.map(([action, count]) => {
                    const barPct   = Math.round((count / max) * 100);
                    const totalPct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={action} className="flex flex-col gap-[3px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{labelAction(action)}</span>
                          <span className="text-[10px] tabular-nums text-gray-600">
                            {count}
                            <span className="text-gray-700 ml-1">{totalPct}%</span>
                          </span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, background: color, opacity: 0.65 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}