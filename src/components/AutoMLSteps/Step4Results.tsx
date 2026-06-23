"use client";

import {
  ACCENT,
  LLM_PROVIDERS, LLM_KEY_HINTS,
  interpretLearningCurve,
  type TrainResult, type HistoryEntry, type SavedRun,
  type LLMProvider, type Explanation,
} from "@/lib/automlUtils";
import {
  RankingTable, WinnerMetricsGrid, FeatureImportanceChart, ModelComparisonChart,
} from "./AutoMLCharts";

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
  onSetLlmExp:           (v: Explanation | null) => void;
  onGenerateAnalysis:    () => void;
  onSetTrainResult:      (r: TrainResult) => void;
  onRunAgain:            () => void;
  onClose:               () => void;
  onSaveVersion:         () => void;
  onSaveToPipeline:      () => void;
}

export default function Step4Results({
  trainResult, history, file, savedRuns, savedFlash, isLoadedFromSaved,
  analysisExpanded, llmProvider, llmExp, llmLoading, llmProgress,
  showKeyInput, userApiKey, customLLMUrl, customLLMModel,
  onSetAnalysisExpanded, onSetShowKeyInput, onSetLlmProvider,
  onSetUserApiKey, onSetCustomLLMUrl, onSetCustomLLMModel, onSetLlmExp,
  llmError, onGenerateAnalysis, onSetTrainResult, onRunAgain, onClose, onSaveVersion, onSaveToPipeline,
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
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
            Driving features
          </div>
          <FeatureImportanceChart features={automl.feature_importance} />
        </div>
      )}

      {/* AI Analysis panel */}
      <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <button
            onClick={() => onSetAnalysisExpanded(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
              AI Analysis
            </div>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.2s", transform: analysisExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
              <polyline points="2,3 5,7 8,3" />
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => onSetShowKeyInput(v => !v)}
              style={{
                padding: "0.2rem 0.55rem", borderRadius: 6, cursor: "pointer",
                background: showKeyInput ? `${ACCENT}22` : "transparent",
                border: `1px solid ${showKeyInput ? ACCENT + "44" : "var(--border2)"}`,
                color: showKeyInput ? ACCENT : "var(--text3)", fontSize: "0.68rem", fontWeight: 600,
                whiteSpace: "nowrap" as const,
              }}
            >
              {showKeyInput ? "Hide key" : "Use my API key"}
            </button>
            <select
              value={llmProvider}
              onChange={(e) => { onSetLlmProvider(e.target.value as LLMProvider); onSetLlmExp(null); }}
              style={{
                fontSize: "0.72rem", color: "var(--text2)", background: "var(--border)",
                border: "1px solid var(--border2)", borderRadius: 6,
                padding: "0.25rem 0.5rem", cursor: "pointer",
              }}
            >
              {LLM_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button
              onClick={onGenerateAnalysis}
              disabled={llmLoading}
              style={{
                padding: "0.25rem 0.7rem", borderRadius: 6, cursor: llmLoading ? "default" : "pointer",
                background: `${ACCENT}22`, border: `1px solid ${ACCENT}44`,
                color: ACCENT, fontSize: "0.72rem", fontWeight: 600, opacity: llmLoading ? 0.6 : 1,
                whiteSpace: "nowrap" as const,
              }}
            >
              {llmLoading ? "Generating..." : llmExp ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>

        {/* LLM error display */}
        {llmError && !llmLoading && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#f87171", lineHeight: 1.45, padding: "0.35rem 0.6rem", borderRadius: 6, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
            AI error: {llmError} — showing rule-based analysis instead.
          </div>
        )}

        {/* API key + custom fields */}
        {showKeyInput && (
          <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <input
              type="password"
              value={userApiKey}
              onChange={(e) => onSetUserApiKey(e.target.value)}
              placeholder="API key (overrides server key)"
              style={{ width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7, background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box" as const }}
            />
            <input
              type="text"
              value={customLLMUrl}
              onChange={(e) => onSetCustomLLMUrl(e.target.value)}
              placeholder="Provider base URL (e.g. https://api.cohere.com/compatibility/v1) — leave empty to use provider above"
              style={{ width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7, background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box" as const }}
            />
            <input
              type="text"
              value={customLLMModel}
              onChange={(e) => onSetCustomLLMModel(e.target.value)}
              placeholder={customLLMUrl.trim()
                ? "Model name required (e.g. command-a-03-2025 for Cohere, gpt-4o for OpenAI)"
                : "Model override (optional, e.g. gpt-4o, claude-opus-4-8)"}
              style={{ width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7, background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box" as const }}
            />
            <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: 0, lineHeight: 1.45 }}>
              {LLM_KEY_HINTS[llmProvider]}
            </p>
            <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: 0 }}>
              Key is used only for this request and never stored. Server key is shared and may be rate-limited — use yours for faster responses.
            </p>
          </div>
        )}

        {/* Expanded content */}
        {analysisExpanded && (
          <div>
            {llmLoading && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                    Asking {(showKeyInput && customLLMUrl.trim())
                      ? (customLLMModel.trim() || "your provider")
                      : LLM_PROVIDERS.find(p => p.value === llmProvider)?.label}...
                  </span>
                  <span style={{ fontSize: "0.72rem", color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{Math.round(llmProgress)}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${llmProgress}%`, background: `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})`, borderRadius: 9999, transition: "width 0.4s ease" }} />
                </div>
              </div>
            )}

            {/* Model comparison chart */}
            {!llmLoading && llmExp?.model_comparison && llmExp.model_comparison.length > 0 && (
              <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text)", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
                    Model fitness for this dataset{" "}
                    <span
                      title="LLM-rated score (0–100) estimating how well this algorithm fits your dataset's characteristics — higher is better."
                      style={{ cursor: "help", color: "var(--text3)", fontWeight: 400, fontSize: "0.7rem" }}
                    >ⓘ</span>
                  </div>
                  <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
                    LLM-rated 0–100 for your specific data. <span style={{ color: ACCENT }}>90–100</span> = excellent fit.{" "}
                    <span style={{ color: "#fbbf24" }}>60–89</span> = good, may benefit from tuning.{" "}
                    <span style={{ color: "#f87171" }}>Below 60</span> = poor fit — consider more data or different features.
                  </p>
                </div>
                <ModelComparisonChart items={llmExp.model_comparison} />
              </div>
            )}

            {/* Why winner */}
            {!llmLoading && llmExp?.why_won && (
              <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
                  Why {automl.winner} won
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                  {llmExp.why_won}
                </p>
                {llmExp.score_analysis && (
                  <p style={{ fontSize: "0.76rem", color: "var(--text2)", lineHeight: 1.6, margin: "0.6rem 0 0", paddingLeft: "0.75rem", borderLeft: `2px solid ${ACCENT}44` }}>
                    {llmExp.score_analysis}
                  </p>
                )}
              </div>
            )}

            {/* Rule-based fallback */}
            {!llmLoading && !llmExp && automl.explanation?.why_won && (
              <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.65, margin: "0.75rem 0 0", fontStyle: "italic" }}>
                {automl.explanation.why_won}
              </p>
            )}

            {/* Actionable insights */}
            {!llmLoading && llmExp?.actionable_insights && llmExp.actionable_insights.length > 0 && (
              <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                  Actionable insights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {llmExp.actionable_insights.map((ins, i) => (
                    <div key={i} style={{ padding: "0.6rem 0.75rem", borderRadius: 8, background: `${ACCENT}08`, border: `1px solid ${ACCENT}22`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0, marginTop: 5 }} />
                      <div>
                        <div style={{ fontSize: "0.73rem", fontWeight: 700, color: ACCENT, marginBottom: "0.2rem" }}>{ins.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text2)", lineHeight: 1.55 }}>{ins.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
        <button onClick={onSaveToPipeline} style={{ flex: 1, padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: ACCENT, border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 700 }}>
          Save to Pipeline
        </button>
      </div>
    </div>
  );
}
