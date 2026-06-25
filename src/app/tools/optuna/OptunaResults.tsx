"use client";
import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { TrialHistoryChart, LearningCurveChart } from "./OptunaCharts";

const ACCENT = "#a78bfa";

interface FIEntry { feature: string; importance: number }
interface CVEntry { name: string; score: number; fold_scores?: number[] }
interface TrialEntry { trial: number; value: number }

interface TrainResult {
  winner: string;
  task?: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
  optuna_params?: Record<string, number | string>;
  optuna_best_score?: number;
  optuna_n_trials?: number;
  optuna_trials?: TrialEntry[];
  optuna_param_importance?: Record<string, number>;
  optuna_error?: string;
  optuna_sampler?: string;
  optuna_primary_metric?: string;
  optuna_secondary_metric?: string;
  optuna_secondary_trials?: TrialEntry[];
  learning_curve?: {
    train_sizes: number[];
    train_scores: number[];
    val_scores: number[];
    metric_label: string;
    cv_folds: number;
  };
}

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(0,0,0,0.2)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  padding: "0.9rem 1rem",
  ...extra,
});

const label = (extra?: React.CSSProperties): React.CSSProperties => ({
  fontSize: "0.68rem",
  fontWeight: 700,
  color: ACCENT,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  marginBottom: "0.6rem",
  ...extra,
});

const badge = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  fontSize: "0.72rem",
  fontWeight: 700,
  background: `${ACCENT}18`,
  border: `1px solid ${ACCENT}35`,
  color: ACCENT,
  ...extra,
});

function mdToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0.75rem 0"/>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:0.9rem 0 0.25rem;font-size:0.84rem;font-weight:700;color:var(--text)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:1rem 0 0.3rem;font-size:0.9rem;font-weight:700;color:var(--text)">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em style="color:var(--text);font-style:italic">$1</em>')
    .replace(/\n\n/g, '</p><p style="margin:0.5rem 0">')
    .replace(/^(?!<h[234]|<\/p>|<p)(.+)$/gm, '$1')
    .replace(/^/, '<p style="margin:0">')
    .replace(/$/, '</p>');
}

export default function OptunaResults({ result }: { result: TrainResult }) {
  const trials = result.optuna_trials ?? [];
  const nTrials = result.optuna_n_trials ?? 0;
  const bestTrial = trials.length > 0
    ? trials.reduce((a, b) => (b.value > a.value ? b : a))
    : null;
  const firstVal = trials[0]?.value ?? null;
  const improvement = firstVal !== null && bestTrial !== null && firstVal !== 0
    ? (((bestTrial.value - firstVal) / Math.abs(firstVal)) * 100).toFixed(1)
    : null;

  const tuningRan = nTrials > 0 || (result.optuna_params != null && Object.keys(result.optuna_params).length > 0) || trials.length > 0;
  const displayTrials = trials.slice(0, 30);

  const paramImp = result.optuna_param_importance
    ? Object.entries(result.optuna_param_importance).sort((a, b) => b[1] - a[1])
    : [];
  const maxImp = paramImp[0]?.[1] ?? 1;

  const bestParams = result.optuna_params
    ? Object.entries(result.optuna_params)
    : null;

  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("gemini-2.5");
  const [explaining, setExplaining] = useState(false);
  const [expProgress, setExpProgress] = useState(0);
  const [optunaExp, setOptunaExp] = useState<string | null>(null);
  const [expError, setExpError] = useState<string | null>(null);
  const [showExpForm, setShowExpForm] = useState(false);

  const handleExplain = async () => {
    if (!apiKey.trim()) { setExpError("API key required"); return; }
    setExplaining(true);
    setExpProgress(0);
    setExpError(null);
    setOptunaExp(null);
    const timer = setInterval(() => {
      setExpProgress(p => p < 88 ? p + Math.random() * 6 : p);
    }, 500);
    try {
      const fd = new FormData();
      fd.append("winner", result.winner);
      fd.append("task", result.task ?? "classification");
      fd.append("n_trials", String(result.optuna_n_trials ?? 0));
      fd.append("best_score", String(result.optuna_best_score ?? 0));
      fd.append("optuna_params_json", JSON.stringify(result.optuna_params ?? {}));
      fd.append("param_importance_json", JSON.stringify(result.optuna_param_importance ?? {}));
      fd.append("feature_importance_json", JSON.stringify(result.feature_importance ?? []));
      fd.append("winner_metrics_json", JSON.stringify(result.winner_metrics ?? {}));
      fd.append("api_key", apiKey);
      fd.append("provider", provider);
      const resp = await fetch(`${ML_UNIFIED_API}/optuna-explain`, { method: "POST", body: fd });
      const data = await resp.json();
      clearInterval(timer);
      setExpProgress(100);
      if (data.error) {
        setTimeout(() => {
          setExpError(data.error);
          setExplaining(false);
        }, 300);
      } else {
        setTimeout(() => setOptunaExp(data.explanation ?? "No explanation returned."), 300);
        setTimeout(() => setExplaining(false), 600);
      }
    } catch (e) {
      clearInterval(timer);
      setExpError(e instanceof Error ? e.message : "Request failed");
      setExplaining(false);
    }
  };

  const METRIC_KEYS = ["accuracy", "f1_weighted", "f1_macro", "precision", "recall", "roc_auc", "mae", "rmse", "r2"];
  const metrics = Object.entries(result.winner_metrics)
    .filter(([k]) => METRIC_KEYS.some(mk => k.toLowerCase().includes(mk)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {result.optuna_error && (
        <div style={{ padding: "0.6rem 0.8rem", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, fontSize: "0.72rem", color: "#f87171", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          <strong>Tuning error:</strong> {result.optuna_error}
        </div>
      )}

      {/* A — Bayesian Optimization Summary */}
      <div style={{ ...card(), background: `${ACCENT}0d`, border: `1px solid ${ACCENT}30` }}>
        <div style={label()}>Bayesian Hyperparameter Optimization</div>
        {tuningRan ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={badge()}>
                {result.optuna_sampler === "qmc" ? "QMC Sampler" : "TPE Sampler"}
              </span>
              <span style={badge()}>N Trials: {nTrials}</span>
              {bestTrial && (
                <span style={badge()}>Best at Trial {bestTrial.trial}</span>
              )}
              {improvement !== null && parseFloat(improvement) > 0 && (
                <span style={badge({ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" })}>
                  +{improvement}% improvement
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text3)", lineHeight: 1.5 }}>
              {result.optuna_sampler === "qmc"
                ? "QMC (Quasi-Monte Carlo / Sobol) uses low-discrepancy sequences for uniform coverage of the hyperparameter space, reducing clustering seen in random sampling."
                : "TPE (Tree-structured Parzen Estimator) models the distribution of good vs. bad hyperparameter regions, sampling more from promising areas each trial."
              }
              {(bestTrial || result.optuna_best_score) && (
                <> Best CV score: <span style={{ color: ACCENT, fontWeight: 700 }}>{(bestTrial?.value ?? result.optuna_best_score)?.toFixed(4)}</span>.</>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
            Tuning was skipped — results use default parameters.
          </div>
        )}
      </div>

      {/* B/C/D — Trial History | HP Importance + Best Params side by side */}
      {(displayTrials.length > 0 || paramImp.length > 0 || bestParams) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>

          {/* B — Trial History chart (left) */}
          {displayTrials.length > 0 && (
            <TrialHistoryChart
              trials={displayTrials}
              bestTrial={bestTrial}
              primaryMetricLabel={result.optuna_primary_metric && result.optuna_primary_metric !== "auto" ? result.optuna_primary_metric.replace("_", "-").toUpperCase() : undefined}
              secondaryTrials={result.optuna_secondary_trials}
              secondaryMetricLabel={result.optuna_secondary_metric !== "none" ? result.optuna_secondary_metric : undefined}
            />
          )}

          {/* C + D — HP Importance + Best Params stacked (right) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {paramImp.length > 0 && (
              <div style={card()}>
                <div style={label()}>Hyperparameter Importance</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {paramImp.map(([param, imp]) => (
                    <div key={param} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: 120, fontSize: "0.72rem", fontWeight: 600, color: "var(--text2)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {param}
                      </span>
                      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                        <div style={{ height: "100%", width: `${(imp / maxImp) * 100}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 5px ${ACCENT}44` }} />
                      </div>
                      <span style={{ width: 40, fontSize: "0.7rem", fontWeight: 700, color: ACCENT, textAlign: "right", flexShrink: 0 }}>
                        {(imp * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={card()}>
              <div style={label()}>Best Tuned Parameters</div>
              {bestParams && bestParams.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {bestParams.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.5rem", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                      <span style={{ flex: 1, fontSize: "0.75rem", fontWeight: 600, color: "var(--text2)" }}>{k}</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: ACCENT }}>
                        {typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
                  Default parameters used (tuning was skipped or failed).
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* E — Winner Metrics */}
      {metrics.length > 0 && (
        <div>
          <div style={label({ color: "var(--text3)" })}>Winner Metrics — {result.winner}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem" }}>
            {metrics.map(([k, v]) => {
              const isPrimary = !!result.optuna_primary_metric && k === result.optuna_primary_metric;
              const isSecondary = !!result.optuna_secondary_metric && result.optuna_secondary_metric !== "none" && k === result.optuna_secondary_metric;
              return (
                <div key={k}
                  title={isPrimary ? "Primary optimization metric — Optuna tuned for this" : isSecondary ? "Secondary tracked metric" : undefined}
                  style={{ background: isPrimary ? `${ACCENT}15` : "rgba(0,0,0,0.2)", border: isPrimary ? `1px solid ${ACCENT}40` : isSecondary ? "1px solid rgba(52,211,153,0.25)" : "none", borderRadius: 8, padding: "0.6rem 0.8rem", textAlign: "center", cursor: isPrimary || isSecondary ? "help" : "default" }}
                >
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>{typeof v === "number" ? v.toFixed(4) : v}</div>
                  <div style={{ fontSize: "0.65rem", color: isPrimary ? ACCENT : isSecondary ? "#34d399" : "var(--text3)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}{isPrimary ? " ★" : isSecondary ? " ◆" : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* F — Feature Importance */}
      {result.feature_importance.length > 0 && (
        <div>
          <div style={label({ color: "var(--text3)" })}>Feature Importance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {result.feature_importance.slice(0, 10).map((f, i) => {
              const maxFI = result.feature_importance[0]?.importance ?? 1;
              return (
                <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span style={{ width: 160, fontSize: "0.75rem", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "var(--text)" : "var(--text2)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.feature}
                  </span>
                  <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ height: "100%", width: `${(f.importance / maxFI) * 100}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 5px ${ACCENT}44` }} />
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, width: 45, textAlign: "right" }}>
                    {f.importance.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* F2 — Learning Curve */}
      {result.learning_curve && (
        <div>
          <div style={label({ color: "var(--text3)" })}>Learning Curve</div>
          <LearningCurveChart
            trainSizes={result.learning_curve.train_sizes}
            trainScores={result.learning_curve.train_scores}
            valScores={result.learning_curve.val_scores}
            metricLabel={result.learning_curve.metric_label}
          />
        </div>
      )}

      {/* G — AI Explanation of Optuna Results */}
      {tuningRan && (
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <div style={label({ marginBottom: 0 })}>AI Explanation</div>
            {!showExpForm && !optunaExp && (
              <button
                onClick={() => setShowExpForm(true)}
                style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.35rem 0.85rem", borderRadius: 7, border: `1px solid ${ACCENT}40`, background: `${ACCENT}12`, color: ACCENT, cursor: "pointer" }}
              >
                Get AI Explanation
              </button>
            )}
          </div>

          {!optunaExp && showExpForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <select value={provider} onChange={e => setProvider(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.4rem 0.6rem", color: "var(--text)", fontSize: "0.8rem", outline: "none" }}>
                <option value="gemini-2.5">Gemini 2.5 Flash</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="openai">OpenAI GPT-4o Mini</option>
                <option value="cohere">Cohere command-a-03-2025</option>
                <option value="groq">Groq Llama 70B</option>
              </select>
              <input
                type="password"
                placeholder={provider.startsWith("gemini") ? "Google AI API key..." : provider === "openai" ? "OpenAI API key..." : provider === "cohere" ? "Cohere API key..." : "Groq API key..."}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.4rem 0.6rem", color: "var(--text)", fontSize: "0.8rem", outline: "none" }}
              />
              <button
                onClick={handleExplain}
                disabled={explaining}
                style={{ padding: "0.45rem 1rem", borderRadius: 7, border: "none", background: explaining ? "rgba(167,139,250,0.3)" : ACCENT, color: "#000", fontSize: "0.8rem", fontWeight: 700, cursor: explaining ? "not-allowed" : "pointer", alignSelf: "flex-start" }}
              >
                {explaining ? "Analyzing..." : "Explain"}
              </button>
              {expError && <div style={{ fontSize: "0.72rem", color: "#f87171" }}>{expError}</div>}
              {explaining && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
                    <span>Generating explanation...</span>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>{Math.round(expProgress)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                    <div style={{
                      height: "100%", borderRadius: 9999, background: ACCENT,
                      boxShadow: `0 0 8px ${ACCENT}66`,
                      width: `${expProgress}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {optunaExp && (
            <div>
              <div
                style={{ fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: mdToHtml(optunaExp) }}
              />
              <button onClick={() => { setOptunaExp(null); setShowExpForm(true); }} style={{ display: "block", marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text3)", background: "none", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
                Re-explain
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
