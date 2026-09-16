"use client";

import {
  ACCENT,
  LLM_PROVIDERS, LLM_KEY_HINTS,
  type LLMProvider, type Explanation,
} from "@/lib/automlUtils";
import { ModelComparisonChart } from "./AutoMLCharts";

interface Props {
  winner:             string;
  ruleWhyWon?:        string;
  ragUsed?:           boolean;
  analysisExpanded:   boolean;
  llmProvider:        LLMProvider;
  llmExp:             Explanation | null;
  llmLoading:         boolean;
  llmProgress:        number;
  showKeyInput:       boolean;
  userApiKey:         string;
  customLLMUrl:       string;
  customLLMModel:     string;
  llmError:           string | null;
  onSetAnalysisExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSetShowKeyInput:     (v: boolean | ((prev: boolean) => boolean)) => void;
  onSetLlmProvider:      (v: LLMProvider) => void;
  onSetUserApiKey:       (v: string) => void;
  onSetCustomLLMUrl:     (v: string) => void;
  onSetCustomLLMModel:   (v: string) => void;
  onSetLlmExp:           (v: Explanation | null) => void;
  onGenerateAnalysis:    () => void;
}

/**
 * The AI Analysis panel of the AutoML results screen — provider picker, API-key
 * fields, progress, model-comparison chart, "why the winner won" and actionable
 * insights. Extracted from Step4Results so that file stays under the 400-line
 * gate (it was 410); this is a pure presentational split, no behaviour change.
 */
export function AutoMLAnalysisPanel({
  winner, ruleWhyWon, ragUsed,
  analysisExpanded, llmProvider, llmExp, llmLoading, llmProgress,
  showKeyInput, userApiKey, customLLMUrl, customLLMModel, llmError,
  onSetAnalysisExpanded, onSetShowKeyInput, onSetLlmProvider,
  onSetUserApiKey, onSetCustomLLMUrl, onSetCustomLLMModel, onSetLlmExp,
  onGenerateAnalysis,
}: Props) {
  return (
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
          {ragUsed && (
            <div title="Knowledge-base enhanced — RAG context was retrieved for this explanation"
              style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.1rem 0.35rem", borderRadius: 5, background: `${ACCENT}18`, border: `1px solid ${ACCENT}40` }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="10" height="2.5" rx="0.8" />
                <rect x="1" y="6.5" width="10" height="2.5" rx="0.8" />
                <line x1="3" y1="1.5" x2="9" y2="1.5" />
              </svg>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.04em" }}>KB</span>
            </div>
          )}
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
                Why {winner} won
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
          {!llmLoading && !llmExp && ruleWhyWon && (
            <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.65, margin: "0.75rem 0 0", fontStyle: "italic" }}>
              {ruleWhyWon}
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
  );
}
