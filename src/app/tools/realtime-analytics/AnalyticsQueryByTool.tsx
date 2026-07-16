"use client";

interface QueryByToolItem {
  path: string;
  success_count: number;
  total_count: number;
  success_rate: number;
}

const PATH_NAMES: Record<string, string> = {
  "/tools/text-to-sql":         "Text → SQL",
  "/tools/automl":              "AutoML",
  "/tools/preprocessing":       "Preprocessing",
  "/tools/feature-engineering": "Feature Eng.",
  "/tools/feature-selection":   "Feature Sel.",
  "/tools/optuna":              "Optuna",
  "/tools/shap":                "SHAP",
  "/tools/drift":               "Drift",
  "/tools/ensemble":            "Ensemble",
  "/tools/pipeline-builder":    "Pipeline",
  "/tools/pipeline-cinema":     "Cinema",
  "/eda":                       "EDA",
  "/vision":                    "Vision",
  "/":                          "ML Unified",
};

function pathLabel(path: string): string {
  return PATH_NAMES[path] ?? (path.replace("/tools/", "").replace("/", "") || "Home");
}

interface Props {
  data: QueryByToolItem[];
  rangeLabel: string;
}

export default function AnalyticsQueryByTool({ data, rangeLabel }: Props) {
  if (data.length === 0) return null;

  const best = data.reduce((b, t) => t.success_rate > b.success_rate ? t : b, data[0]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">
        Query Success by Tool — {rangeLabel}
      </p>
      <div className="flex flex-col gap-3">
        {data.map(t => {
          const barColor = t.success_rate >= 90 ? "#10b981" : t.success_rate >= 70 ? "#f59e0b" : "#ef4444";
          const isBest   = t.path === best.path;
          return (
            <div key={t.path}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-300">{pathLabel(t.path)}</span>
                  {isBest && (
                    <span className="text-[7px] font-bold px-1.5 py-[1px] rounded-full uppercase tracking-wider"
                      style={{ background: `${barColor}22`, color: barColor, border: `1px solid ${barColor}44` }}>
                      Highest SR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] tabular-nums" style={{ color: "#374151" }}>
                    {t.success_count}/{t.total_count}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: barColor }}>
                    {t.success_rate}%
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${t.success_rate}%`, background: barColor }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}