"use client";

const ACCENT = "#a78bfa";

interface FIEntry { feature: string; importance: number }
interface CVEntry { name: string; score: number; fold_scores?: number[] }
interface TrialEntry { trial: number; value: number }

interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
  optuna_params?: Record<string, number | string>;
  optuna_best_score?: number;
  optuna_n_trials?: number;
  optuna_trials?: TrialEntry[];
  optuna_param_importance?: Record<string, number>;
  optuna_error?: string;
  debug_tune?: string;
  debug_tune_type?: string;
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
  const maxTrialVal = displayTrials.length > 0
    ? Math.max(...displayTrials.map(t => t.value))
    : 1;
  const minTrialVal = displayTrials.length > 0
    ? Math.min(...displayTrials.map(t => t.value))
    : 0;
  const trialRange = maxTrialVal - minTrialVal || 1;

  const paramImp = result.optuna_param_importance
    ? Object.entries(result.optuna_param_importance).sort((a, b) => b[1] - a[1])
    : [];
  const maxImp = paramImp[0]?.[1] ?? 1;

  const bestParams = result.optuna_params
    ? Object.entries(result.optuna_params)
    : null;

  const METRIC_KEYS = ["accuracy", "f1_weighted", "f1_macro", "precision_weighted",
    "recall_weighted", "roc_auc", "mae", "rmse", "r2"];
  const metrics = Object.entries(result.winner_metrics)
    .filter(([k]) => METRIC_KEYS.some(mk => k.toLowerCase().includes(mk)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Debug: tune value received by backend */}
      {(result.debug_tune !== undefined) && (
        <div style={{ padding: "0.5rem 0.8rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: "0.72rem", color: "#a5b4fc" }}>
          Backend received tune={result.debug_tune} (type: {result.debug_tune_type})
        </div>
      )}

      {/* Debug: optuna error */}
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
              <span style={badge()}>TPE Sampler</span>
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
              TPE (Tree-structured Parzen Estimator) models the distribution of good vs. bad
              hyperparameter regions, sampling more from promising areas each trial.
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

          {/* B — Trial History SVG chart (left) */}
          {displayTrials.length > 0 && (() => {
            const W = 340, H = 180, PL = 10, PR = 10, PT = 12, PB = 24;
            const cw = W - PL - PR, ch = H - PT - PB;
            const yMin = Math.min(...displayTrials.map(t => t.value));
            const yMax = Math.max(...displayTrials.map(t => t.value));
            const yRange = yMax - yMin || 0.01;
            const xStep = cw / Math.max(displayTrials.length - 1, 1);
            const toX = (i: number) => PL + i * xStep;
            const toY = (v: number) => PT + ch - ((v - yMin) / yRange) * ch;

            // running best
            let runBest = -Infinity;
            const bestLine = displayTrials.map(t => {
              if (t.value > runBest) runBest = t.value;
              return runBest;
            });

            const trialPolyline = displayTrials.map((t, i) => `${toX(i)},${toY(t.value)}`).join(" ");
            const bestPolyline  = bestLine.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

            return (
              <div style={card()}>
                <div style={label()}>Trial History</div>
                {bestTrial && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginBottom: "0.5rem" }}>
                    Best: Trial <span style={{ color: ACCENT, fontWeight: 700 }}>#{bestTrial.trial}</span> — score <span style={{ color: ACCENT, fontWeight: 700 }}>{bestTrial.value.toFixed(4)}</span>
                  </div>
                )}
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(f => {
                    const y = PT + ch * (1 - f);
                    const val = yMin + yRange * f;
                    return (
                      <g key={f}>
                        <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        <text x={PL - 2} y={y + 3.5} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.3)">{val.toFixed(2)}</text>
                      </g>
                    );
                  })}
                  {/* X axis labels */}
                  {displayTrials.filter((_, i) => i === 0 || i === displayTrials.length - 1 || (i + 1) % 10 === 0).map((t, _, arr) => {
                    const i = displayTrials.indexOf(t);
                    return <text key={t.trial} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{t.trial}</text>;
                  })}
                  {/* Running best line */}
                  <polyline points={bestPolyline} fill="none" stroke={`${ACCENT}50`} strokeWidth="1.5" strokeDasharray="4 2" />
                  {/* Trial score line */}
                  <polyline points={trialPolyline} fill="none" stroke={`${ACCENT}88`} strokeWidth="1.5" />
                  {/* Dots */}
                  {displayTrials.map((t, i) => {
                    const isBest = bestTrial !== null && t.trial === bestTrial.trial;
                    return (
                      <circle key={t.trial} cx={toX(i)} cy={toY(t.value)} r={isBest ? 5 : 2.5}
                        fill={isBest ? ACCENT : `${ACCENT}99`}
                        stroke={isBest ? "rgba(255,255,255,0.3)" : "none"}
                        strokeWidth={isBest ? 1.5 : 0}
                        style={isBest ? { filter: `drop-shadow(0 0 4px ${ACCENT})` } : {}}
                      />
                    );
                  })}
                </svg>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
                    <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={`${ACCENT}88`} strokeWidth="1.5" /></svg>
                    Trial scores
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
                    <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={`${ACCENT}50`} strokeWidth="1.5" strokeDasharray="4 2" /></svg>
                    Running best
                  </div>
                </div>
                {trials.length > 30 && (
                  <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: "0.3rem" }}>Showing first 30 of {trials.length}</div>
                )}
              </div>
            );
          })()}

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
            {metrics.map(([k, v]) => (
              <div key={k} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.6rem 0.8rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>
                  {typeof v === "number" ? v.toFixed(4) : v}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: "0.15rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              </div>
            ))}
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

    </div>
  );
}
