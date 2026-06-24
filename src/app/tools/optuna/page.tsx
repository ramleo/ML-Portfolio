"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import OptunaRunner from "./OptunaRunner";

const ACCENT = "#a78bfa";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 600, color,
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 9999,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function TechPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 500,
      color: ACCENT, background: `${ACCENT}12`,
      border: `1px solid ${ACCENT}28`,
      borderRadius: 6, padding: "2px 10px",
    }}>{label}</span>
  );
}

type View = "history" | "params" | "importance";

const TRIALS = [
  { trial: 1,  score: 0.812, lr: 0.054, depth: 4, subsample: 0.72, estimators: 120, best: false },
  { trial: 8,  score: 0.831, lr: 0.028, depth: 6, subsample: 0.85, estimators: 200, best: false },
  { trial: 17, score: 0.856, lr: 0.018, depth: 7, subsample: 0.90, estimators: 300, best: false },
  { trial: 29, score: 0.861, lr: 0.012, depth: 8, subsample: 0.88, estimators: 400, best: false },
  { trial: 43, score: 0.874, lr: 0.009, depth: 8, subsample: 0.92, estimators: 450, best: false },
  { trial: 67, score: 0.881, lr: 0.007, depth: 9, subsample: 0.91, estimators: 500, best: true },
];

const PARAM_IMPORTANCE = [
  { param: "learning_rate", importance: 0.41 },
  { param: "max_depth", importance: 0.28 },
  { param: "n_estimators", importance: 0.17 },
  { param: "subsample", importance: 0.09 },
  { param: "min_child_weight", importance: 0.03 },
  { param: "colsample_bytree", importance: 0.02 },
];

const SEARCH_SPACE = [
  { param: "learning_rate", type: "float", range: "0.001 – 0.3", scale: "log" },
  { param: "max_depth", type: "int", range: "3 – 12", scale: "uniform" },
  { param: "n_estimators", type: "int", range: "100 – 1000", scale: "uniform" },
  { param: "subsample", type: "float", range: "0.5 – 1.0", scale: "uniform" },
  { param: "min_child_weight", type: "int", range: "1 – 10", scale: "uniform" },
  { param: "colsample_bytree", type: "float", range: "0.5 – 1.0", scale: "uniform" },
];

const VIEW_CONTENT: Record<View, React.ReactNode> = {
  history: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Trial History — Best Trials</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Showing trials that improved the best score. Total: 100 trials, sampler: TPE, pruner: MedianPruner.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 80px 70px 60px 80px 80px 50px", gap: "0.5rem", padding: "0.4rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span>Trial</span><span>AUC</span><span>Learn. Rate</span><span>Depth</span><span>Subsample</span><span>Estimators</span><span></span>
        </div>
        {TRIALS.map(t => (
          <div key={t.trial} style={{ display: "grid", gridTemplateColumns: "60px 80px 70px 60px 80px 80px 50px", gap: "0.5rem", padding: "0.55rem 0.5rem", fontSize: "0.78rem", borderBottom: "1px solid rgba(255,255,255,0.04)", background: t.best ? `${ACCENT}08` : "transparent", alignItems: "center" }}>
            <span style={{ color: "var(--text3)" }}>#{t.trial}</span>
            <span style={{ fontWeight: 700, color: t.best ? ACCENT : "var(--text)" }}>{t.score.toFixed(3)}</span>
            <span style={{ color: "var(--text2)" }}>{t.lr}</span>
            <span style={{ color: "var(--text2)" }}>{t.depth}</span>
            <span style={{ color: "var(--text2)" }}>{t.subsample}</span>
            <span style={{ color: "var(--text2)" }}>{t.estimators}</span>
            {t.best ? <Badge label="best" color={ACCENT} /> : <span />}
          </div>
        ))}
      </div>
    </div>
  ),
  params: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Search Space & Best Parameters</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>The ranges Optuna explored, the scale used for sampling, and the winning values from trial #67.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {SEARCH_SPACE.map((s, i) => {
          const best = TRIALS[TRIALS.length - 1];
          const vals: Record<string, string | number> = {
            learning_rate: best.lr,
            max_depth: best.depth,
            n_estimators: best.estimators,
            subsample: best.subsample,
            min_child_weight: 3,
            colsample_bytree: 0.88,
          };
          return (
            <div key={s.param} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.9rem", background: i % 2 === 0 ? "rgba(0,0,0,0.15)" : "transparent", borderRadius: 8 }}>
              <span style={{ width: 160, fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{s.param}</span>
              <span style={{ width: 50, fontSize: "0.7rem", color: ACCENT, background: `${ACCENT}10`, borderRadius: 4, padding: "1px 6px", textAlign: "center", flexShrink: 0 }}>{s.type}</span>
              <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--text2)" }}>{s.range} <span style={{ color: "var(--text3)" }}>({s.scale})</span></span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: ACCENT }}>{vals[s.param]}</span>
            </div>
          );
        })}
      </div>
    </div>
  ),
  importance: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Hyperparameter Importance</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Computed via fANOVA — how much of the variance in trial scores is explained by each hyperparameter.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {PARAM_IMPORTANCE.map(p => (
          <div key={p.param} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: 160, fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{p.param}</span>
            <div style={{ flex: 1, height: 10, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", width: `${Math.round(p.importance * 100 / 0.41)}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 6px ${ACCENT}55`, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ACCENT, width: 42, textAlign: "right" }}>{Math.round(p.importance * 100)}%</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", background: `${ACCENT}0a`, border: `1px solid ${ACCENT}20`, borderRadius: 10, fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>
        <strong style={{ color: ACCENT }}>learning_rate</strong> accounts for 41% of score variance — confirming the well-known importance of step size in gradient boosting. <strong style={{ color: "var(--text)" }}>max_depth</strong> follows at 28%, with the remaining parameters contributing incrementally.
      </div>
    </div>
  ),
};

export default function OptunaPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("history");
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Badge label="Step 3" color={ACCENT} />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Optuna Tuning</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        <OptunaRunner />

        {/* Static showcase — example data */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid #374151", borderRadius: 4, padding: "2px 8px" }}>Example Output</span>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Upload your CSV above to see real results</span>
        </div>

        {/* Hero */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Bayesian Hyperparameter Optimization
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                Optuna's Tree-structured Parzen Estimator (TPE) builds a probabilistic model of the objective function to propose high-value parameter regions, outperforming random search in far fewer trials.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <TechPill label="optuna" />
              <TechPill label="XGBoost" />
              <TechPill label="TPE sampler" />
              <TechPill label="MedianPruner" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Trials", value: "100" },
            { label: "Best AUC", value: "0.881", accent: true },
            { label: "Baseline AUC", value: "0.812" },
            { label: "Gain", value: "+0.069", accent: true },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
            {(["history", "params", "importance"] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1, padding: "0.45rem 0.5rem", border: "none", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                  background: view === v ? ACCENT : "transparent",
                  color: view === v ? "#000" : "var(--text3)",
                  boxShadow: view === v ? `0 0 12px ${ACCENT}55` : "none",
                }}
                onMouseEnter={e => { if (view !== v) e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { if (view !== v) e.currentTarget.style.color = "var(--text3)"; }}
              >
                {v === "history" ? "Trial History" : v === "params" ? "Best Params" : "HP Importance"}
              </button>
            ))}
          </div>
          {VIEW_CONTENT[view]}
        </div>

        {/* Strategy card */}
        <div style={{ ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22` }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Why TPE over Grid Search?
          </div>
          <div style={{ fontSize: "0.84rem", color: "var(--text2)", lineHeight: 1.65 }}>
            Grid search with 6 hyperparameters at 5 values each requires 15,625 evaluations. TPE reached a better result in 100 trials by modeling which parameter regions are promising — reducing compute by 99.4% while improving final AUC by 6.9 points over the default baseline.
          </div>
        </div>
      </div>

      <ToolsAIChat context={{
        tool: "Optuna Hyperparameter Tuning",
        summary: "Optuna-powered hyperparameter optimisation visualiser using Tree-structured Parzen Estimator (TPE). Shows trial history, parameter importance, and convergence plots. Demonstrates efficient Bayesian search vs grid/random search.",
      }} />
    </div>
  );
}