"use client";
import { TrialHistoryChart, LearningCurveChart } from "./OptunaCharts";
import OptunaAIExplain from "./OptunaAIExplain";
import { ACCENT, card, label, badge, type TrainResult } from "./optunaResultsStyle";

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

  const METRIC_KEYS = ["accuracy", "f1_weighted", "f1_macro", "precision", "recall", "roc_auc", "mae", "rmse", "r2"];
  const METRIC_DISPLAY: Record<string, string> = { accuracy: "Accuracy", f1_weighted: "F1 Weighted", f1_macro: "F1 Macro", precision: "Precision", recall: "Recall", roc_auc: "ROC-AUC", mae: "MAE", rmse: "RMSE", r2: "R²", mape: "MAPE", max_error: "Max Error", median_ae: "Median AE" };
  const metricLabel = (k: string) => METRIC_DISPLAY[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
              primaryMetricLabel={result.optuna_primary_metric && result.optuna_primary_metric !== "auto" ? metricLabel(result.optuna_primary_metric) : undefined}
              secondaryTrials={result.optuna_secondary_trials}
              secondaryMetricLabel={result.optuna_secondary_metric && result.optuna_secondary_metric !== "none" ? metricLabel(result.optuna_secondary_metric) : undefined}
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
                      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "rgba(var(--fg-rgb),0.07)" }}>
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
                  <div style={{ fontSize: "0.65rem", color: isPrimary ? ACCENT : isSecondary ? "#34d399" : "var(--text3)", marginTop: "0.15rem", letterSpacing: "0.04em" }}>{metricLabel(k)}{isPrimary ? " ★" : isSecondary ? " ◆" : ""}</div>
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
                  <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "rgba(var(--fg-rgb),0.07)" }}>
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
      {result.learning_curve && (() => {
        const lc = result.learning_curve;
        const lastTrain = lc.train_scores[lc.train_scores.length - 1] ?? 0;
        const lastVal   = lc.val_scores[lc.val_scores.length - 1] ?? 0;
        // Lower-is-better metrics (RMSE, MAE): overfitting = val > train (positive raw gap)
        // Higher-is-better metrics (R², F1, AUC): overfitting = train > val (positive raw gap)
        const lowerIsBetter = /rmse|mae|error/i.test(lc.metric_label);
        const rawGap = lowerIsBetter ? lastVal - lastTrain : lastTrain - lastVal;
        const baseline = Math.max(Math.abs(lastTrain), Math.abs(lastVal), 0.0001);
        const gapPct = (rawGap / baseline) * 100;
        const lcNote = gapPct > 10
          ? { text: `⚠ Train–validation gap: ${gapPct.toFixed(1)}% — possible overfitting. Try more regularization or more data.`, color: "#f87171" }
          : gapPct < 3
          ? { text: `✓ Train and validation scores are close (gap ${gapPct.toFixed(1)}%) — model generalizes well.`, color: "#34d399" }
          : { text: `Train–validation gap: ${gapPct.toFixed(1)}%. Moderate variance, within normal range.`, color: "var(--text3)" };
        return (
          <div>
            <div style={label({ color: "var(--text3)" })}>Learning Curve</div>
            <LearningCurveChart trainSizes={lc.train_sizes} trainScores={lc.train_scores} valScores={lc.val_scores} metricLabel={lc.metric_label} />
            <div style={{ marginTop: "0.45rem", fontSize: "0.7rem", color: lcNote.color, lineHeight: 1.5 }}>{lcNote.text}</div>
          </div>
        );
      })()}

      {/* G — AI Explanation of Optuna Results (extracted to OptunaAIExplain.tsx) */}
      <OptunaAIExplain result={result} tuningRan={tuningRan} />

    </div>
  );
}
