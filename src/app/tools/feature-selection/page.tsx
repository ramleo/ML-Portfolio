"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#fb923c";

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

type Method = "filter" | "wrapper" | "embedded";

const FEATURES = [
  { name: "revenue_per_user", mi: 0.34, vif: 1.2, rfImportance: 0.18, kept: true },
  { name: "age_decade", mi: 0.28, vif: 1.5, rfImportance: 0.14, kept: true },
  { name: "bmi_category", mi: 0.26, vif: 1.8, rfImportance: 0.12, kept: true },
  { name: "glucose_insulin", mi: 0.24, vif: 2.1, rfImportance: 0.11, kept: true },
  { name: "income_dependents", mi: 0.21, vif: 1.9, rfImportance: 0.09, kept: true },
  { name: "day_of_week", mi: 0.18, vif: 1.1, rfImportance: 0.08, kept: true },
  { name: "floor_area_rooms", mi: 0.15, vif: 2.3, rfImportance: 0.06, kept: true },
  { name: "log_revenue", mi: 0.14, vif: 3.1, rfImportance: 0.05, kept: true },
  { name: "name_length", mi: 0.06, vif: 1.3, rfImportance: 0.02, kept: false },
  { name: "hour_bucket", mi: 0.04, vif: 1.0, rfImportance: 0.01, kept: false },
  { name: "raw_timestamp", mi: 0.02, vif: 8.7, rfImportance: 0.00, kept: false },
  { name: "user_id_hash", mi: 0.01, vif: 12.4, rfImportance: 0.00, kept: false },
];

const BAR_MAX = 0.34;

function MiBar({ value, max = BAR_MAX }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 0.15 ? ACCENT : value >= 0.05 ? "#f59e0b" : "#6b7280";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
        <div style={{ height: "100%", width: `${Math.max(pct, 2)}%`, borderRadius: 9999, background: color, boxShadow: value >= 0.15 ? `0 0 6px ${color}66` : "none", transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color, width: 30, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const METHOD_CONTENT: Record<Method, React.ReactNode> = {
  filter: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Filter Methods</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Mutual Information scores rank each feature independently of the model. Features below 0.03 were dropped before any fitting.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {FEATURES.map(f => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", opacity: f.kept ? 1 : 0.45 }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: f.kept ? ACCENT : "#6b7280", flexShrink: 0 }} />
            <span style={{ width: 170, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)", flexShrink: 0 }}>{f.name}</span>
            <div style={{ flex: 1, minWidth: 0 }}><MiBar value={f.mi} /></div>
            {!f.kept && <span style={{ fontSize: "0.65rem", color: "#6b7280", flexShrink: 0 }}>dropped</span>}
          </div>
        ))}
      </div>
    </div>
  ),
  wrapper: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Recursive Feature Elimination</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>RFE with cross-validation (RFECV) using a Random Forest estimator. Trains repeatedly, eliminating the weakest feature each round.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Estimator", value: "RandomForestClassifier" },
          { label: "CV Folds", value: "5-fold stratified" },
          { label: "Scoring", value: "ROC-AUC" },
          { label: "Step Size", value: "1 feature / round" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.6rem 0.9rem" }}>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.15rem" }}>{s.label}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.5rem" }}>RF Feature Importances (top 8 surviving features)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {FEATURES.filter(f => f.kept).map(f => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: 170, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)", flexShrink: 0 }}>{f.name}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", width: `${Math.round((f.rfImportance / 0.18) * 100)}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 5px ${ACCENT}55` }} />
            </div>
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: ACCENT, width: 36, textAlign: "right" }}>{f.rfImportance.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  embedded: (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Embedded Methods</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>L1 regularization (Lasso / LogisticRegression with penalty='l1') shrinks weak feature coefficients to exactly zero during training.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[
          { label: "L1 / Lasso", detail: "Shrinks 4 low-signal features to zero. Used for linear model path.", action: "Dropped: name_length, hour_bucket, raw_timestamp, user_id_hash" },
          { label: "Tree Importance Threshold", detail: "Random Forest importances < 0.01 → removed. Agrees with L1 on all 4 drops.", action: "Confirms the 4 dropped features" },
          { label: "VIF Filter", detail: "Variance Inflation Factor > 5 flags multicollinearity. raw_timestamp (VIF 8.7) and user_id_hash (VIF 12.4) flagged and removed.", action: "Removed multicollinear columns" },
        ].map(m => (
          <div key={m.label} style={{ padding: "0.9rem 1rem", background: "rgba(0,0,0,0.2)", borderRadius: 10, border: `1px solid ${ACCENT}18` }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" }}>{m.label}</div>
            <div style={{ fontSize: "0.76rem", color: "var(--text2)", marginBottom: "0.35rem" }}>{m.detail}</div>
            <div style={{ fontSize: "0.72rem", color: ACCENT }}>{m.action}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export default function FeatureSelectionPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("filter");
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  const kept = FEATURES.filter(f => f.kept).length;
  const dropped = FEATURES.filter(f => !f.kept).length;

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
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Selection</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Hero */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Keeping Only What Matters
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                Feature selection reduces overfitting, speeds up training, and improves interpretability. Three complementary methods — filter, wrapper, and embedded — were applied in sequence and their outputs compared for agreement.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <TechPill label="mutual_info" />
              <TechPill label="RFECV" />
              <TechPill label="Lasso" />
              <TechPill label="VIF" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Input Features", value: "47" },
            { label: "Features Kept", value: String(kept), accent: true },
            { label: "Features Dropped", value: String(dropped) },
            { label: "AUC Improvement", value: "+0.031" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Method tabs */}
        <div style={CARD}>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
            {(["filter", "wrapper", "embedded"] as Method[]).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: "0.45rem 0.5rem", border: "none", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                  background: method === m ? ACCENT : "transparent",
                  color: method === m ? "#000" : "var(--text3)",
                  boxShadow: method === m ? `0 0 12px ${ACCENT}55` : "none",
                }}
                onMouseEnter={e => { if (method !== m) e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { if (method !== m) e.currentTarget.style.color = "var(--text3)"; }}
              >
                {m === "filter" ? "Filter" : m === "wrapper" ? "Wrapper (RFE)" : "Embedded"}
              </button>
            ))}
          </div>
          {METHOD_CONTENT[method]}
        </div>

        {/* Agreement panel */}
        <div style={{ ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22` }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Method Agreement
          </div>
          <div style={{ fontSize: "0.84rem", color: "var(--text2)", lineHeight: 1.65 }}>
            All three methods agreed on the same 4 features to drop: <strong style={{ color: "var(--text)" }}>name_length, hour_bucket, raw_timestamp, user_id_hash</strong>. When filter, wrapper, and embedded methods reach identical conclusions independently, it is strong evidence the features carry no predictive signal.
          </div>
        </div>
      </div>
    </div>
  );
}