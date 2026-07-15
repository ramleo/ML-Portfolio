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

function ToolColumn({ toolKey, actions }: { toolKey: string; actions: Record<string, number> }) {
  const name   = TOOL_NAMES[toolKey]  ?? toolKey;
  const color  = TOOL_COLORS[toolKey] ?? "#6b7280";
  const total  = Object.values(actions).reduce((s, n) => s + n, 0);
  const sorted = Object.entries(actions).sort(([, a], [, b]) => b - a);
  const max    = sorted[0]?.[1] ?? 1;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {name}
          </span>
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
          {total.toLocaleString()}
        </span>
      </div>

      <div className="h-px" style={{ background: `${color}28` }} />

      {/* Action rows */}
      {sorted.length === 0 ? (
        <p className="text-[10px] text-gray-700">No events</p>
      ) : (
        sorted.map(([action, count]) => {
          const barPct     = Math.round((count / max) * 100);
          const totalPct   = total > 0 ? Math.round((count / total) * 100) : 0;
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
        })
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">
          {TOOL_ORDER.map((tool, i) => (
            <div key={tool} className={i > 0 ? "lg:pl-6 pt-4 lg:pt-0" : ""}>
              <ToolColumn toolKey={tool} actions={hfTools[tool] ?? {}} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}