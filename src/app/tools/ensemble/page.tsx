"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import RepulsionCard from "@/components/RepulsionCard";

const ACCENT = "#f472b6";

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

type View = "models" | "stacking" | "comparison";

const BASE_MODELS = [
  { name: "XGBoost", auc: 0.881, f1: 0.847, role: "Primary", color: "#34d399" },
  { name: "LightGBM", auc: 0.874, f1: 0.839, role: "Base", color: "#38bdf8" },
  { name: "Random Forest", auc: 0.862, f1: 0.828, role: "Base", color: "#a78bfa" },
  { name: "Logistic Regression", auc: 0.831, f1: 0.794, role: "Meta-learner", color: ACCENT },
  { name: "SVM (RBF)", auc: 0.845, f1: 0.811, role: "Base", color: "#f59e0b" },
];

const ENSEMBLE_METHODS = [
  {
    name: "Soft Voting",
    auc: 0.889,
    f1: 0.855,
    desc: "Averages predicted probabilities across XGBoost, LightGBM, and RF. Simple, effective when base models are well-calibrated.",
    weights: "XGB: 0.45 | LGBM: 0.35 | RF: 0.20",
  },
  {
    name: "Stacking (LR meta)",
    auc: 0.894,
    f1: 0.861,
    desc: "Base model OOF predictions become meta-learner features. Logistic Regression learns optimal combination weights.",
    weights: "5-fold OOF, LR C=0.5",
  },
  {
    name: "Blending (holdout)",
    auc: 0.891,
    f1: 0.857,
    desc: "20% holdout for meta-feature generation. Faster than stacking, slightly lower variance.",
    weights: "80/20 split, LR meta-learner",
  },
];

const VIEW_CONTENT: Record<View, React.ReactNode> = {
  models: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Base Model Performance</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Individual model performance before ensembling. Each was tuned independently via Optuna (100 trials, 5-fold CV).</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", gap: "0.5rem", padding: "0.4rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span>Model</span><span>AUC</span><span>F1</span><span>Role</span>
        </div>
        {BASE_MODELS.map(m => (
          <div key={m.name} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 100px", gap: "0.5rem", padding: "0.6rem 0.5rem", fontSize: "0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: m.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{m.name}</span>
            </div>
            <span style={{ fontWeight: 700, color: m.color }}>{m.auc.toFixed(3)}</span>
            <span style={{ color: "var(--text2)" }}>{m.f1.toFixed(3)}</span>
            <Badge label={m.role} color={m.color} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: "1.25rem", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: "0.75rem", color: "var(--text3)", lineHeight: 1.6 }}>
        Model diversity is critical: XGBoost and LightGBM share similar gradient-boosting mechanics. RF and SVM provide orthogonal error profiles — the ensemble benefits most when base models make different mistakes.
      </div>
    </div>
  ),
  stacking: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Stacking Architecture</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Out-of-fold predictions from base models feed the meta-learner, preventing data leakage from the stacked features.</div>
      </div>

      {/* Architecture diagram (CSS-based) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {/* Layer 0: Input */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "0.4rem 1.2rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>
            Training Data (38 features)
          </div>
        </div>

        <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.8rem" }}>5-fold cross-validation split</div>

        {/* Layer 1: Base models */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          {["XGBoost", "LightGBM", "Random Forest", "SVM (RBF)"].map((m, i) => {
            const colors = ["#34d399", "#38bdf8", "#a78bfa", "#f59e0b"];
            return (
              <div key={m} style={{ padding: "0.45rem 0.9rem", background: `${colors[i]}12`, border: `1px solid ${colors[i]}30`, borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, color: colors[i] }}>{m}</div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.8rem" }}>OOF probability predictions → stacked features</div>

        {/* Layer 2: Meta-learner */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "0.4rem 1.2rem", background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, color: ACCENT }}>
            Logistic Regression (meta-learner)
          </div>
        </div>

        <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.8rem" }}>final prediction</div>

        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "0.4rem 1.2rem", background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`, borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, color: ACCENT }}>
            AUC 0.894 · F1 0.861
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {[
          { label: "CV Strategy", value: "5-fold stratified" },
          { label: "Meta-learner", value: "LogisticRegression C=0.5" },
          { label: "OOF Features", value: "4 probability columns" },
          { label: "Leakage Check", value: "Passed — no train-test contamination" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.65rem 0.9rem" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.15rem" }}>{s.label}</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  ),
  comparison: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Ensemble Method Comparison</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Three ensemble strategies evaluated on the same held-out test set. All outperform the best single model.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {ENSEMBLE_METHODS.map((e, i) => {
          const isBest = i === 1;
          return (
            <div key={e.name} style={{ padding: "1rem 1.1rem", background: isBest ? `${ACCENT}08` : "rgba(0,0,0,0.18)", borderRadius: 10, border: `1px solid ${isBest ? ACCENT + "35" : "rgba(255,255,255,0.06)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.45rem" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>{e.name}</span>
                {isBest && <Badge label="best" color={ACCENT} />}
                <span style={{ marginLeft: "auto", fontSize: "0.85rem", fontWeight: 800, color: isBest ? ACCENT : "var(--text2)" }}>AUC {e.auc.toFixed(3)}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text3)" }}>F1 {e.f1.toFixed(3)}</span>
              </div>
              <div style={{ fontSize: "0.77rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "0.4rem" }}>{e.desc}</div>
              <div style={{ fontSize: "0.72rem", color: isBest ? ACCENT : "var(--text3)" }}>{e.weights}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>vs. Best Single Model (XGBoost AUC 0.881)</div>
        {ENSEMBLE_METHODS.map(e => (
          <div key={e.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: 170, fontSize: "0.78rem", color: "var(--text)", fontWeight: 500, flexShrink: 0 }}>{e.name}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", width: `${Math.round(((e.auc - 0.881) / 0.013) * 100)}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 5px ${ACCENT}55` }} />
            </div>
            <span style={{ fontSize: "0.73rem", fontWeight: 700, color: ACCENT, width: 55, textAlign: "right" }}>+{(e.auc - 0.881).toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export default function EnsemblePage() {
  const router = useRouter();
  const [view, setView] = useState<View>("models");
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
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Ensemble Methods</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Hero */}
        <RepulsionCard style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Combining Models for Higher Accuracy
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                No single model dominates every data slice. Ensemble methods — voting, stacking, and blending — combine diverse base learners to reduce variance and capture complementary strengths.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <TechPill label="scikit-learn" />
              <TechPill label="StackingClassifier" />
              <TechPill label="VotingClassifier" />
              <TechPill label="OOF stacking" />
            </div>
          </div>
        </RepulsionCard>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Base Models", value: "4" },
            { label: "Best Single AUC", value: "0.881" },
            { label: "Best Ensemble AUC", value: "0.894", accent: true },
            { label: "Gain from Ensemble", value: "+0.013", accent: true },
          ].map(s => (
            <RepulsionCard key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
            </RepulsionCard>
          ))}
        </div>

        {/* View tabs */}
        <RepulsionCard style={CARD}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
            {(["models", "stacking", "comparison"] as View[]).map(v => (
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
                {v === "models" ? "Base Models" : v === "stacking" ? "Stacking" : "Comparison"}
              </button>
            ))}
          </div>
          {VIEW_CONTENT[view]}
        </RepulsionCard>

        {/* Key insight */}
        <RepulsionCard style={{ ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22` }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            When to Use Stacking vs. Voting
          </div>
          <div style={{ fontSize: "0.84rem", color: "var(--text2)", lineHeight: 1.65 }}>
            Soft voting is preferable when all base models are well-calibrated and the dataset is small (meta-learner overfitting risk). Stacking wins when base models have distinct error profiles and enough data exists for 5-fold OOF generation without over-representing any single fold. In this project, stacking gained +0.005 AUC over voting — marginal but consistent across five random seeds.
          </div>
        </RepulsionCard>
      </div>

      <ToolsAIChat context={{
        tool: "Ensemble & Stacking",
        summary: "Ensemble learning visualiser covering soft voting, hard voting, and stacking with a meta-learner. Shows how combining diverse base models (XGBoost, Random Forest, LightGBM) reduces variance and improves AUC over any single model.",
      }} />
    </div>
  );
}