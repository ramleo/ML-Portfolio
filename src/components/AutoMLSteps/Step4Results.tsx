"use client";

import {
  ACCENT,
  interpretLearningCurve,
  type TrainResult, type HistoryEntry, type SavedRun,
  type LLMProvider, type Explanation,
} from "@/lib/automlUtils";
import {
  RankingTable, WinnerMetricsGrid,
} from "./AutoMLCharts";
import { AutoMLAnalysisPanel } from "./AutoMLAnalysisPanel";
import { FeatureImportanceSection } from "./FeatureImportanceSection";
import { ML_UNIFIED_API } from "@/config/urls";

interface Props {
  trainResult:        TrainResult;
  history:            HistoryEntry[];
  file:               File | null;
  savedRuns:          SavedRun[];
  savedFlash:         boolean;
  isLoadedFromSaved:  boolean;
  analysisExpanded:   boolean;
  llmProvider:        LLMProvider;
  llmExp:             Explanation | null;
  llmLoading:         boolean;
  llmProgress:        number;
  showKeyInput:       boolean;
  userApiKey:         string;
  customLLMUrl:       string;
  customLLMModel:     string;
  onSetAnalysisExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSetShowKeyInput:     (v: boolean | ((prev: boolean) => boolean)) => void;
  onSetLlmProvider:      (v: LLMProvider) => void;
  onSetUserApiKey:       (v: string) => void;
  onSetCustomLLMUrl:     (v: string) => void;
  onSetCustomLLMModel:   (v: string) => void;
  llmError:              string | null;
  ragUsed?:              boolean;
  onSetLlmExp:           (v: Explanation | null) => void;
  onGenerateAnalysis:    () => void;
  onSetTrainResult:      (r: TrainResult) => void;
  onRunAgain:            () => void;
  onClose:               () => void;
  onSaveVersion:         () => void;
}

export default function Step4Results({
  trainResult, history, file, savedRuns, savedFlash, isLoadedFromSaved,
  analysisExpanded, llmProvider, llmExp, llmLoading, llmProgress,
  showKeyInput, userApiKey, customLLMUrl, customLLMModel, ragUsed,
  onSetAnalysisExpanded, onSetShowKeyInput, onSetLlmProvider,
  onSetUserApiKey, onSetCustomLLMUrl, onSetCustomLLMModel, onSetLlmExp,
  llmError, onGenerateAnalysis, onSetTrainResult, onRunAgain, onClose, onSaveVersion,
}: Props) {
  const { automl } = trainResult;
  const isReg      = automl.task === "regression";
  const winnerCV   = automl.cv_results.find(r => r.algorithm === automl.winner);
  const cvDisplay  = winnerCV
    ? isReg ? winnerCV.score.toFixed(2) : `${(winnerCV.score * 100).toFixed(2)}%`
    : null;
  const testDisplay = isReg
    ? trainResult.metric
    : `${(parseFloat(trainResult.metric) * 100).toFixed(2)}%`;

  const dsName   = file?.name ?? trainResult.title ?? "";
  const dsCount  = savedRuns.filter(r => r.datasetName === dsName).length;
  const atCap    = dsCount >= 5;
  const blocked  = savedFlash || isLoadedFromSaved || atCap;
  const tipText  = isLoadedFromSaved
    ? "Already saved — load is read-only"
    : atCap ? "Cap reached (5/5) — delete a run first"
    : undefined;

  return (
    <div>
      {/* Winner banner */}
      <div style={{
        padding: "1rem 1.25rem", borderRadius: 12, marginBottom: "0.75rem",
        background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: "0.62rem", color: ACCENT, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.2rem" }}>Winner</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text)" }}>{automl.winner}</div>
          <a
            href={`${ML_UNIFIED_API}/models/${trainResult.id}/export`}
            download
            style={{
              display: "inline-block",
              marginTop: "0.35rem",
              fontSize: "0.75rem",
              color: "#22c55e",
              border: "1px solid #22c55e",
              borderRadius: "0.3rem",
              padding: "0.2rem 0.6rem",
              textDecoration: "none",
            }}
          >
            ↓ Download .skops
          </a>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.15rem" }}>
            {automl.selection_metric} · {automl.cv_results.length}-model competition · 5-fold CV
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.1rem" }}>
            Test set: <span style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{testDisplay}</span>
            {cvDisplay && testDisplay !== cvDisplay && (
              <span style={{ color: "var(--text3)", marginLeft: "0.4rem" }}>(CV: {cvDisplay})</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
            {cvDisplay ?? testDisplay}
          </div>
          <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>5-fold CV · {trainResult.metricLabel}</div>
        </div>
      </div>

      {/* Extended metrics */}
      {automl.winner_metrics && (
        <WinnerMetricsGrid metrics={automl.winner_metrics} task={automl.task} ci95={automl.ci_95} />
      )}

      {/* Learning curve interpretation */}
      {automl.learning_curve && (() => {
        const lc = automl.learning_curve!;
        const gap = lc.train_scores[lc.train_scores.length - 1] - lc.val_scores[lc.val_scores.length - 1];
        const finalVal = lc.val_scores[lc.val_scores.length - 1];
        const label = interpretLearningCurve(gap, finalVal, automl.n_rows);
        const color = label === "Good fit" ? "#22c55e" : label === "Overfitting" ? "#f97316" : "#eab308";
        return (
          <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "var(--text3)" }}>
            Learning curve: <span style={{ color, fontWeight: 700 }}>{label}</span>
          </div>
        );
      })()}

      {/* Feature importance */}
      {automl.feature_importance && automl.feature_importance.length > 0 && (
        <FeatureImportanceSection features={automl.feature_importance} />
      )}

      {/* AI Analysis panel */}
      <AutoMLAnalysisPanel
        winner={automl.winner}
        ruleWhyWon={automl.explanation?.why_won}
        ragUsed={ragUsed}
        analysisExpanded={analysisExpanded}
        llmProvider={llmProvider}
        llmExp={llmExp}
        llmLoading={llmLoading}
        llmProgress={llmProgress}
        showKeyInput={showKeyInput}
        userApiKey={userApiKey}
        customLLMUrl={customLLMUrl}
        customLLMModel={customLLMModel}
        llmError={llmError}
        onSetAnalysisExpanded={onSetAnalysisExpanded}
        onSetShowKeyInput={onSetShowKeyInput}
        onSetLlmProvider={onSetLlmProvider}
        onSetUserApiKey={onSetUserApiKey}
        onSetCustomLLMUrl={onSetCustomLLMUrl}
        onSetCustomLLMModel={onSetCustomLLMModel}
        onSetLlmExp={onSetLlmExp}
        onGenerateAnalysis={onGenerateAnalysis}
      />

      {/* Full ranking */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
          Full ranking
        </div>
        <RankingTable results={automl.cv_results} winner={automl.winner} task={automl.task} />
      </div>

      {/* Previous runs */}
      {history.length > 1 && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
            Previous runs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {history.slice(1).map((h, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.5rem 0.85rem", borderRadius: 8,
                background: "var(--bg-glass)", border: "1px solid var(--border)", gap: "0.75rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text3)", flexShrink: 0 }}>{h.ts}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>{h.result.automl.winner}</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                    {h.result.automl.task === "regression" ? h.result.metric : (parseFloat(h.result.metric) * 100).toFixed(2) + "%"}
                  </span>
                </div>
                <button onClick={() => onSetTrainResult(h.result)} style={{
                  padding: "0.25rem 0.65rem", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                  background: "transparent", border: `1px solid ${ACCENT}44`,
                  color: ACCENT, fontSize: "0.7rem", fontWeight: 600,
                }}>View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem", flexWrap: "wrap" as const }}>
        <button onClick={onRunAgain} style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}>
          Run Again
        </button>
        <button onClick={onClose} style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}>
          Close
        </button>
        <button onClick={() => window.open(`${ML_UNIFIED_API}/model/${trainResult.id}/download`, "_blank")} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1v8M4 6l3 3 3-3" /><path d="M2 11h10" /></svg>
          Download Model (.pkl)
        </button>
        <button
          onClick={onSaveVersion}
          disabled={blocked}
          title={tipText}
          style={{
            padding: "0.6rem 1.2rem", borderRadius: 9999,
            cursor: blocked ? "default" : "pointer",
            background: savedFlash ? `${ACCENT}33` : `${ACCENT}18`,
            border: `1px solid ${ACCENT}44`,
            color: blocked && !savedFlash ? "var(--text3)" : ACCENT,
            fontSize: "0.82rem", fontWeight: 600,
            transition: "background 0.2s, color 0.2s",
            opacity: blocked && !savedFlash ? 0.45 : 1,
          }}
        >
          {savedFlash ? "Saved!" : atCap ? "5 / 5 Full" : "Save Version"}
        </button>
      </div>
    </div>
  );
}
