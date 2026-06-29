"use client";

import { useCallback } from "react";
import { ML_UNIFIED_API as API } from "@/config/urls";
import { ACCENT, type TrainResult, type HistoryEntry } from "@/lib/automlUtils";

interface TrainParams {
  file:           File;
  target:         string;
  taskType:       "classification" | "regression";
  modelName:      string;
  selectedModels: Set<string>;
  colEncodings:   Record<string, string>;
  dropCols:       string[];
  useSMOTE:       boolean;
}

interface TrainCallbacks {
  onStart:       () => void;
  onPct:         (pct: number) => void;
  onMsg:         (msg: string) => void;
  onResult:      (result: TrainResult) => void;
  onError:       (msg: string) => void;
  addHistory:    (entry: HistoryEntry) => void;
}

export function useAutoMLTrain() {
  const handleTrain = useCallback(async (params: TrainParams, cb: TrainCallbacks) => {
    const { file, target, taskType, modelName, selectedModels, colEncodings, dropCols, useSMOTE } = params;
    cb.onStart();
    try {
      const fd = new FormData();
      fd.append("file",                file);
      fd.append("model_name",          modelName || "AutoML Model");
      fd.append("target_col",          target);
      fd.append("task",                taskType);
      fd.append("algorithm",           "AutoML");
      fd.append("accent",              ACCENT);
      fd.append("feature_engineering", "{}");
      fd.append("fe_b64",              "");
      fd.append("pre_fe_cols_json",    "[]");
      fd.append("pre_fe_sample_json",  "{}");
      fd.append("tune",                "false");
      fd.append("n_trials",            "10");
      fd.append("selected_models",     JSON.stringify([...selectedModels]));
      fd.append("use_smote",           String(taskType === "classification" && useSMOTE));
      fd.append("col_encoding_json",   JSON.stringify(colEncodings));
      fd.append("drop_cols_json",      JSON.stringify(dropCols));

      const res = await fetch(`${API}/train`, { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error("Training request failed.");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.pct != null && evt.pct >= 0) cb.onPct(evt.pct);
            if (evt.msg) cb.onMsg(evt.msg);
            if (evt.done) {
              if (evt.error) throw new Error(evt.error);
              if (evt.result) {
                const r: TrainResult = { ...evt.result, fileName: file?.name };
                cb.onResult(r);
                cb.addHistory({ ts: new Date().toLocaleTimeString(), result: r });
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected token") throw parseErr;
          }
        }
      }
    } catch (e) {
      cb.onError(e instanceof Error ? e.message : "Training failed.");
    }
  }, []);

  return { handleTrain };
}