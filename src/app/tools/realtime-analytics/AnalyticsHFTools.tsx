"use client";

const TOOL_NAMES: Record<string, string> = {
  "ml-unified": "ML Unified",
  "eda":        "EDA Explorer",
  "vision":     "ML Vision",
};

const TOOL_COLORS: Record<string, string> = {
  "ml-unified": "#818cf8",
  "eda":        "#34d399",
  "vision":     "#e879f9",
};

const TOOL_ORDER = ["ml-unified", "eda", "vision"];

const ACTION_LABELS: Record<string, string> = {
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

function labelAction(action: string): string {
  return ACTION_LABELS[action] ?? (action.charAt(0).toUpperCase() + action.slice(1));
}

interface HFToolsProps {
  hfTools: Record<string, Record<string, number>>;
}

function ToolCard({ toolKey, actions }: { toolKey: string; actions: Record<string, number> }) {
  const name  = TOOL_NAMES[toolKey] ?? toolKey;
  const color = TOOL_COLORS[toolKey] ?? "#6b7280";
  const total = Object.values(actions).reduce((s, n) => s + n, 0);
  const sorted = Object.entries(actions).sort(([, a], [, b]) => b - a);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-1 truncate">
          {name}
        </p>
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ color }}
        >
          {total.toLocaleString()}
        </span>
      </div>

      {/* Action rows */}
      {sorted.length === 0 ? (
        <p className="text-[10px] text-gray-600">No events today</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map(([action, count]) => {
            const pct = Math.round((count / max) * 100);
            return (
              <div key={action}>
                <div className="flex justify-between items-center mb-[3px]">
                  <span className="text-[9px] text-gray-400">{labelAction(action)}</span>
                  <span className="text-[9px] tabular-nums text-gray-500">{count.toLocaleString()}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsHFTools({ hfTools }: HFToolsProps) {
  const hasAny = TOOL_ORDER.some(t => Object.keys(hfTools[t] ?? {}).length > 0);

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
        HF Space Tools
      </p>
      {!hasAny ? (
        <p className="text-[10px] text-gray-600">No HF Space activity in this period</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {TOOL_ORDER.map(tool => (
            <ToolCard key={tool} toolKey={tool} actions={hfTools[tool] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}