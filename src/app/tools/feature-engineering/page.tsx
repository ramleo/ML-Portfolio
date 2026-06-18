"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#38bdf8";

type Tab = "create" | "transform" | "interact";

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

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{sub}</div>
    </div>
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

function FeatureRow({ name, formula, desc, type }: { name: string; formula: string; desc: string; type: string }) {
  const typeColor = type === "numeric" ? "#34d399" : type === "datetime" ? "#f59e0b" : "#c084fc";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", padding: "0.75rem 0", borderBottom: "1px solid rgba(255,255,255,0.045)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.18rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{name}</span>
          <span style={{ fontSize: "0.62rem", fontWeight: 600, color: typeColor, background: `${typeColor}14`, border: `1px solid ${typeColor}28`, borderRadius: 9999, padding: "1px 7px" }}>{type}</span>
        </div>
        <code style={{ fontSize: "0.72rem", color: ACCENT, background: `${ACCENT}10`, borderRadius: 4, padding: "1px 6px" }}>{formula}</code>
        <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.25rem" }}>{desc}</div>
      </div>
    </div>
  );
}

const CREATED_FEATURES = [
  { name: "BMI Category", formula: "bmi > 30 → 'Obese' | bmi > 25 → 'Overweight' | ...", desc: "Binned BMI into clinical categories — improves tree splits", type: "numeric" },
  { name: "Age Decade", formula: "floor(age / 10) * 10", desc: "Decade-level age grouping reduces noise in linear models", type: "numeric" },
  { name: "Day of Week", formula: "timestamp.dayofweek", desc: "Extracted from purchase timestamp — strong weekly pattern", type: "datetime" },
  { name: "Hour Bucket", formula: "floor(hour / 6)", desc: "Groups hours into morning/afternoon/evening/night", type: "datetime" },
  { name: "Revenue per User", formula: "total_revenue / user_count", desc: "Ratio feature capturing per-capita performance", type: "numeric" },
  { name: "Name Length", formula: "len(product_name)", desc: "Text length as proxy for product complexity", type: "categorical" },
];

const TRANSFORMS = [
  { name: "Log Transform", formula: "log(1 + x)", desc: "Reduces right skew on revenue, count columns", type: "numeric" },
  { name: "Square Root", formula: "sqrt(x)", desc: "Milder skew reduction, handles zero values", type: "numeric" },
  { name: "Box-Cox", formula: "λ-optimal power transform", desc: "Optimized lambda per column for near-normality", type: "numeric" },
  { name: "Min-Max Scaling", formula: "(x - min) / (max - min)", desc: "Scales to [0,1] — used for neural net inputs", type: "numeric" },
  { name: "Z-Score", formula: "(x - μ) / σ", desc: "Unit variance — standard for SVM, KNN", type: "numeric" },
  { name: "Yeo-Johnson", formula: "λ-power (handles negatives)", desc: "Box-Cox variant that accepts negative values", type: "numeric" },
];

const INTERACTIONS = [
  { name: "age × bmi", formula: "age * bmi", desc: "Multiplicative interaction — captures joint risk", type: "numeric" },
  { name: "income ÷ dependents", formula: "income / (dependents + 1)", desc: "Per-dependent income — strong insurance predictor", type: "numeric" },
  { name: "glucose × insulin", formula: "glucose * insulin", desc: "Product term for metabolic interaction", type: "numeric" },
  { name: "area × rooms", formula: "floor_area * num_rooms", desc: "House capacity signal for price models", type: "numeric" },
];

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  create: (
    <div>
      <SectionHeader
        title="Created Features"
        sub="Domain-driven features crafted from raw columns. Each was validated with mutual information scores before inclusion."
      />
      <div>
        {CREATED_FEATURES.map(f => <FeatureRow key={f.name} {...f} />)}
      </div>
    </div>
  ),
  transform: (
    <div>
      <SectionHeader
        title="Transformations Applied"
        sub="Mathematical transforms applied to reduce skew, normalize distributions, and improve model convergence."
      />
      <div>
        {TRANSFORMS.map(f => <FeatureRow key={f.name} {...f} />)}
      </div>
    </div>
  ),
  interact: (
    <div>
      <SectionHeader
        title="Interaction Terms"
        sub="Cross-column products and ratios that capture non-linear relationships invisible to individual features."
      />
      <div>
        {INTERACTIONS.map(f => <FeatureRow key={f.name} {...f} />)}
      </div>
      <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", background: `${ACCENT}0a`, border: `1px solid ${ACCENT}20`, borderRadius: 10 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: ACCENT, marginBottom: "0.3rem" }}>Polynomial expansion</div>
        <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
          Degree-2 PolynomialFeatures applied to the top 5 numeric columns (by variance), generating an additional 15 interaction terms. Evaluated against cross-validated R² before including in final feature set.
        </div>
      </div>
    </div>
  ),
};

const PIPELINE_STEPS = [
  { label: "Raw Data", detail: "47 columns, 12,480 rows" },
  { label: "Domain Features", detail: "+6 hand-crafted" },
  { label: "Transforms", detail: "Log, scaling, Box-Cox" },
  { label: "Interactions", detail: "+4 cross terms" },
  { label: "Selection", detail: "MI + VIF filter → 38 kept" },
];

export default function FeatureEngineeringPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("create");

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
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Engineering</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Hero */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                From Raw Columns to Predictive Features
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                Feature engineering transforms domain knowledge into signals a model can learn from. This page documents every transformation and cross-column interaction applied before model training.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
              <TechPill label="scikit-learn" />
              <TechPill label="pandas" />
              <TechPill label="numpy" />
              <TechPill label="PolynomialFeatures" />
            </div>
          </div>
        </div>

        {/* Pipeline flow */}
        <div style={CARD}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
            Engineering Pipeline
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: i === 0 ? "var(--text2)" : ACCENT, padding: "0.4rem 0.9rem", background: i === 0 ? "rgba(255,255,255,0.05)" : `${ACCENT}12`, border: `1px solid ${i === 0 ? "rgba(255,255,255,0.1)" : ACCENT + "30"}`, borderRadius: 8 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginTop: "0.25rem" }}>{s.detail}</div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ color: "var(--text3)", padding: "0 0.4rem", fontSize: "0.9rem", marginBottom: "1rem" }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
            {(["create", "transform", "interact"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "0.45rem 0.5rem", border: "none", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                  background: tab === t ? ACCENT : "transparent",
                  color: tab === t ? "#000" : "var(--text3)",
                  boxShadow: tab === t ? `0 0 12px ${ACCENT}55` : "none",
                }}
                onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = "var(--text3)"; }}
              >
                {t === "create" ? "Created Features" : t === "transform" ? "Transformations" : "Interactions"}
              </button>
            ))}
          </div>
          {TAB_CONTENT[tab]}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Raw Features", value: "47" },
            { label: "Engineered Added", value: "16" },
            { label: "After Selection", value: "38" },
            { label: "MI Score Threshold", value: "0.03" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT }}>{s.value}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22`, background: `${ACCENT}07` }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Key Insight
          </div>
          <div style={{ fontSize: "0.84rem", color: "var(--text2)", lineHeight: 1.65 }}>
            The single highest-impact feature was <strong style={{ color: "var(--text)" }}>Revenue per User</strong> — a simple ratio that did not exist in the raw data. It had a mutual information score of 0.34 versus the target, placing it in the top 3 features overall. Domain knowledge, not algorithmic search, found it.
          </div>
        </div>
      </div>
    </div>
  );
}