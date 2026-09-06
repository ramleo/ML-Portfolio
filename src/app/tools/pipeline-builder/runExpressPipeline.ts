import { ML_UNIFIED_API as API } from "@/config/urls";
import type { StageResult } from "@/components/pipeline/StageModal";
import type { StageId } from "./stages";
import { trackedFetch } from "@/lib/trackedFetch";

/** The four stages Express mode runs unattended, and the settings it runs them
 *  with — a sensible default for each, because the whole point of the mode is
 *  that the reader is not asked to choose. */
const AUTO_STAGES: StageId[] = ["preprocessing", "feature-eng", "feature-select", "automl"];
const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  preprocessing: { mv_num: "median", mv_cat: "most_frequent", remove_duplicates: true, remove_outliers: false, fix_skewness: false, drop_cols: [] },
  "feature-eng": { transforms: {}, date_cols: [], date_parts: [] },
  "feature-select": { method: "none", top_k: 15 },
  automl: { models: ["RandomForest", "XGBoost", "LightGBM", "CatBoost"], n_folds: 5 },
};
const ENDPOINTS: Record<string, string> = {
  preprocessing: "preprocess", "feature-eng": "feature-eng",
  "feature-select": "feature-select", automl: "automl",
};

type Hooks = {
  csvB64: string;
  target: string;
  taskType: "classification" | "regression";
  onStage: (id: StageId | null) => void;
  onResult: (r: StageResult) => void;
  onCsv: (id: StageId, csv: string) => void;
};

/**
 * Runs the four stages back to back, feeding each one the previous stage's
 * output rather than the original file.
 *
 * Extracted from the page because it is a sequence, not a render: it belongs
 * with the stage catalogue it walks, and the page was over the length limit.
 * A failing stage stops the run rather than passing stale data downstream.
 */
export async function runExpressPipeline({ csvB64, target, taskType, onStage, onResult, onCsv }: Hooks) {
  let currentCsv = csvB64;
  for (const stageId of AUTO_STAGES) {
    onStage(stageId);
    try {
      const extraFields = stageId === "automl" ? { task_type: taskType } : {};
      const res = await trackedFetch(`${API}/pipeline-builder/${ENDPOINTS[stageId]}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_b64: currentCsv, target, config: DEFAULT_CONFIGS[stageId], ...extraFields }),
      }, { tool: "pipeline-builder" });
      if (!res.ok) break;
      const json = await res.json() as Record<string, unknown>;
      onResult({ stageId, outputCsvB64: json.processed_csv_b64 as string | undefined, metric: json.metric as string | undefined, data: json });
      if (json.processed_csv_b64) {
        currentCsv = json.processed_csv_b64 as string;
        onCsv(stageId, currentCsv);
      }
    } catch { break; }
  }
  onStage(null);
}
