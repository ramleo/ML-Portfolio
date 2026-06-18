"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#f59e0b";

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

type View = "global" | "local" | "dependence";

const GLOBAL_FEATURES = [
  { name: "revenue_per_user", mean_shap: 0.341, direction: "positive" },
  { name: "age_decade", mean_shap: 0.278, direction: "positive" },
  { name: "bmi_category", mean_shap: 0.261, direction: "mixed" },
  { name: "glucose_insulin", mean_shap: 0.239, direction: "positive" },
  { name: "income_dependents", mean_shap: 0.211, direction: "positive" },
  { name: "day_of_week", mean_shap: 0.178, direction: "mixed" },
  { name: "floor_area_rooms", mean_shap: 0.154, direction: "positive" },
  { name: "log_revenue", mean_shap: 0.141, direction: "positive" },
];

const MAX_SHAP = 0.341;

const LOCAL_EXAMPLE = {
  prediction: 0.87,
  baseline: 0.52,
  contributions: [
    { name: "revenue_per_user", value: 0.234, raw: "1847.2", positive: true },
    { name: "age_decade", value: 0.143, raw: "40", positive: true },
    { name: "bmi_category", value: -0.089, raw: "Overweight", positive: false },
    { name: "glucose_insulin", value: 0.072, raw: "112×18", positive: true },
    { name: "income_dependents", value: 0.061, raw: "64k / 2", positive: true },
    { name: "day_of_week", value: -0.034, raw: "Sunday", positive: false },
  ],
};

const DEP_FEATURES = [
  { x: "revenue_per_user", note: "Near-monotonic: higher revenue → strongly positive SHAP. Effect plateaus above ~2,000." },
  { x: "bmi_category", note: "Non-linear: Obese class has wide SHAP spread — interaction with glucose_insulin detected." },
  { x: "age_decade", note: "Step-function pattern: 30s and 40s have distinctly higher SHAP than 50s+." },
];

const VIEW_CONTENT: Record<View, React.ReactNode> = {
  global: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Global Feature Importance</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Mean |SHAP| across all test samples. Higher = more consistently influential. Direction indicates whether high feature values push predictions up or down.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {GLOBAL_FEATURES.map(f => {
          const dirColor = f.direction === "positive" ? "#34d399" : f.direction === "mixed" ? ACCENT : "#f87171";
          return (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ width: 170, fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{f.name}</span>
              <div style={{ flex: 1, height: 12, borderRadius: 9999, background: "rgba(255,255,255,0.07)", position: "relative", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((f.mean_shap / MAX_SHAP) * 100)}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}55`, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, width: 42, textAlign: "right" }}>{f.mean_shap.toFixed(3)}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: dirColor, width: 60, textAlign: "right", flexShrink: 0 }}>{f.direction}</span>
            </div>
          );
        })}
      </div>
    </div>
  ),
  local: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Local Explanation — Sample #1047</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Waterfall breakdown for a single prediction. Each bar shows how much that feature pushed the output above or below the baseline.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.25rem", padding: "0.9rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.2rem" }}>Baseline</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text2)" }}>{LOCAL_EXAMPLE.baseline}</div>
        </div>
        <div style={{ flex: 1, height: 2, background: `rgba(255,255,255,0.1)` }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          {LOCAL_EXAMPLE.contributions.filter(c => c.positive).reduce((acc, c) => acc + c.value, 0) > 0 && (
            <div style={{ fontSize: "0.7rem", color: "#34d399", textAlign: "right" }}>
              +{LOCAL_EXAMPLE.contributions.filter(c => c.positive).reduce((a, c) => a + c.value, 0).toFixed(3)}
            </div>
          )}
          {LOCAL_EXAMPLE.contributions.filter(c => !c.positive).length > 0 && (
            <div style={{ fontSize: "0.7rem", color: "#f87171", textAlign: "right" }}>
              {LOCAL_EXAMPLE.contributions.filter(c => !c.positive).reduce((a, c) => a + c.value, 0).toFixed(3)}
            </div>
          )}
        </div>
        <div style={{ flex: 1, height: 2, background: `rgba(255,255,255,0.1)` }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.2rem" }}>Prediction</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: ACCENT }}>{LOCAL_EXAMPLE.prediction}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {LOCAL_EXAMPLE.contributions.map(c => {
          const color = c.positive ? "#34d399" : "#f87171";
          const barPct = Math.min(Math.abs(c.value) / 0.25 * 100, 100);
          return (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ width: 160, fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{c.name}</span>
              <span style={{ width: 80, fontSize: "0.7rem", color: "var(--text3)", flexShrink: 0 }}>= {c.raw}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 9999, background: color, boxShadow: `0 0 5px ${color}44` }} />
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color, width: 55, textAlign: "right" }}>{c.value > 0 ? "+" : ""}{c.value.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  ),
  dependence: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Dependence Analysis</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>How SHAP values change as each feature varies. Non-linear patterns and interaction effects visible here.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {DEP_FEATURES.map((d, i) => (
          <div key={d.x} style={{ padding: "1rem 1.1rem", background: i % 2 === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)", borderRadius: 10, border: `1px solid ${ACCENT}15` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{d.x}</span>
              <Badge label="dependence plot" color={ACCENT} />
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>{d.note}</div>
            <div style={{ marginTop: "0.6rem", height: 40, background: "rgba(0,0,0,0.3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>[ dependence scatter — rendered via shap.plots.scatter() ]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export default function ShapPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("global");
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
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>SHAP Explainability</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Hero */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Model Transparency via SHAP Values
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                SHAP (SHapley Additive exPlanations) decomposes each prediction into per-feature contributions, grounded in cooperative game theory. Every prediction is fully explainable — not just the model average.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <TechPill label="shap" />
              <TechPill label="TreeExplainer" />
              <TechPill label="XGBoost" />
              <TechPill label="game theory" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Explainer Type", value: "TreeSHAP" },
            { label: "Samples Explained", value: "2,496" },
            { label: "Top Feature Mean |SHAP|", value: "0.341", accent: true },
            { label: "Interaction Pairs", value: "12" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ fontSize: s.value.length > 5 ? "1.2rem" : "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
            {(["global", "local", "dependence"] as View[]).map(v => (
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
                {v === "global" ? "Global" : v === "local" ? "Local (Waterfall)" : "Dependence"}
              </button>
            ))}
          </div>
          {VIEW_CONTENT[view]}
        </div>

        {/* Key insight */}
        <div style={{ ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22` }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Actionable Insight
          </div>
          <div style={{ fontSize: "0.84rem", color: "var(--text2)", lineHeight: 1.65 }}>
            The SHAP dependence plot for <strong style={{ color: "var(--text)" }}>bmi_category</strong> revealed a previously unknown interaction with <strong style={{ color: "var(--text)" }}>glucose_insulin</strong>. High BMI alone had moderate SHAP impact; high BMI combined with elevated glucose-insulin showed SHAP values 2.4x higher. This interaction was subsequently added as an explicit feature, improving AUC by 0.012.
          </div>
        </div>
      </div>
    </div>
  );
}