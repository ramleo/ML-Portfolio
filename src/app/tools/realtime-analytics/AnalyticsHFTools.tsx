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

function labelAction(action: string): string {
  return ACTION_LABELS[action] ?? (action.charAt(0).toUpperCase() + action.slice(1));
}

interface HFToolsProps {
  hfTools: Record<string, Record<string, number>>;
}

function ToolCard({ toolKey, actions }: { toolKey: string; actions: Record<string, number> }) {
  const name  = TOOL_NAMES[toolKey]  ?? toolKey;
  const color = TOOL_COLORS[toolKey] ?? "#6b7280";
  const total = Object.values(actions).reduce((s, n) => s + n, 0);
  const sorted = Object.entries(actions).sort(([, a], [, b]) => b - a);
  const max    = sorted[0]?.[1] ?? 1;
  const types  = sorted.length;

  return (
    <div
      className="rounded-xl bg-white/[0.03] flex flex-col overflow-hidden"
      style={{
        border:     "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
          />
          <p className="text-[11px] font-semibold text-white/90 uppercase tracking-widest truncate">
            {name}
          </p>
        </div>
        <span
          className="text-lg font-bold tabular-nums leading-none flex-shrink-0 ml-2"
          style={{ color }}
        >
          {total.toLocaleString()}
        </span>
      </div>

      <div className="h-px mx-4" style={{ background: `${color}22` }} />

      {/* Action rows */}
      <div className="flex flex-col gap-2.5 px-4 py-3 flex-1">
        {sorted.length === 0 ? (
          <p className="text-[10px] text-gray-600">No events today</p>
        ) : (
          sorted.map(([action, count]) => {
            const pct = Math.round((count / max) * 100);
            const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={action} className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-gray-400 leading-none">
                    {labelAction(action)}
                  </span>
                  <span className="text-[10px] tabular-nums text-gray-500 leading-none">
                    {count.toLocaleString()}
                    <span className="text-gray-700 ml-1">{pctOfTotal}%</span>
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full w-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color, opacity: 0.75 }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-0.5">
        <p className="text-[9px] text-gray-700 uppercase tracking-widest">
          {types} action type{types !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsHFTools({ hfTools }: HFToolsProps) {
  const hasAny = TOOL_ORDER.some(t => Object.keys(hfTools[t] ?? {}).length > 0);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
        HF Space Tools
      </p>
      {!hasAny ? (
        <p className="text-[10px] text-gray-600">No HF Space activity in this period</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {TOOL_ORDER.map(tool => (
            <ToolCard key={tool} toolKey={tool} actions={hfTools[tool] ?? {}} />
          ))}
        </div>
      )}
    </div>
  );
}