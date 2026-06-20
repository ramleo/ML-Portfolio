"use client";

import { useMemo } from "react";
import { AnalyzeResult } from "@/lib/preprocessingAlgorithms";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

type RecAction = { label: string; onApply: () => void; active: boolean };

type Rec = {
  id: string;
  type: "drop" | "skew" | "missing" | "encoding" | "standardize" | "info";
  title: string;
  desc: string;
  col?: string;
  actionLabel?: string;
  applied?: boolean;
  onApply?: () => void;
  actions?: RecAction[];
};

function RecTypeIcon({ type }: { type: Rec["type"] }) {
  const colors: Record<Rec["type"], string> = {
    drop: "#f87171", skew: ACCENT, missing: "#fbbf24",
    encoding: "#a78bfa", standardize: "#4ade80", info: "var(--text3)",
  };
  const c = colors[type];
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 3,
      background: c, boxShadow: `0 0 5px ${c}88`,
    }} />
  );
}

export interface SmartRecommendationsProps {
  analyzed: AnalyzeResult;
  target: string;
  dropCols: Set<string>;
  mvNum: string;
  fixSkewness: boolean;
  standardize: boolean;
  encodeMethod: string;
  setDropCols: (fn: (prev: Set<string>) => Set<string>) => void;
  setMvNum: (v: string) => void;
  setFixSkewness: (v: boolean) => void;
  setStandardize: (v: boolean) => void;
  setEncodeMethod: (v: string) => void;
}

export function SmartRecommendations({
  analyzed, target, dropCols, mvNum, fixSkewness, standardize, encodeMethod,
  setDropCols, setMvNum, setFixSkewness, setStandardize, setEncodeMethod,
}: SmartRecommendationsProps) {
  const recs: Rec[] = useMemo(() => {
    const list: Rec[] = [];
    const numCols = analyzed.columns.filter(c => c.is_numeric);
    const catCols = analyzed.columns.filter(c => !c.is_numeric);

    // ID-like columns
    analyzed.columns
      .filter(c => c.nunique >= analyzed.rows * 0.97 && c.name !== target)
      .forEach(col => {
        list.push({
          id: `drop-${col.name}`, type: "drop",
          title: `Drop ${col.name}`,
          desc: `Every row has a unique value — likely an ID with no predictive signal.`,
          col: col.name,
          applied: dropCols.has(col.name),
          actionLabel: "Drop it",
          onApply: () => setDropCols(prev => { const n = new Set(prev); n.add(col.name); return n; }),
        });
      });

    // High-skew columns
    const highSkewCols = numCols.filter(c => Math.abs(c.skew ?? 0) >= 1 && !dropCols.has(c.name));
    if (highSkewCols.length > 0) {
      list.push({
        id: "fix-skew", type: "skew",
        title: `Fix skewness (${highSkewCols.length} col${highSkewCols.length > 1 ? "s" : ""})`,
        desc: `${highSkewCols.map(c => `${c.name} (${(c.skew ?? 0).toFixed(1)})`).join(", ")} — log1p makes distributions more symmetric, improving linear models significantly.`,
        applied: fixSkewness,
        actionLabel: "Enable",
        onApply: () => setFixSkewness(true),
      });
    }

    // Heavy missing (>15%)
    const heavyMissing = numCols.filter(c => c.missing > 0 && (c.missing / analyzed.rows) > 0.15 && !dropCols.has(c.name));
    if (heavyMissing.length > 0) {
      list.push({
        id: "knn-impute", type: "missing",
        title: "Use KNN imputation",
        desc: `${heavyMissing.map(c => `${c.name} (${Math.round((c.missing / analyzed.rows) * 100)}%)`).join(", ")} — KNN captures local patterns for heavy missingness better than mean.`,
        applied: mvNum === "knn",
        actionLabel: "Use KNN",
        onApply: () => setMvNum("knn"),
      });
    }

    // High-cardinality categoricals
    catCols.filter(c => c.nunique > 30 && !dropCols.has(c.name)).forEach(col => {
      list.push({
        id: `highcard-${col.name}`, type: "encoding",
        title: `High cardinality: ${col.name}`,
        desc: `${col.nunique} unique values — one-hot would add ${col.nunique} columns. Frequency or Target encoding are safer options.`,
        applied: encodeMethod === "frequency" || encodeMethod === "target",
        actions: [
          { label: "Use Frequency", onApply: () => setEncodeMethod("frequency"), active: encodeMethod === "frequency" },
          { label: "Use Target Encoding", onApply: () => setEncodeMethod("target"), active: encodeMethod === "target" },
        ],
      });
    });

    // Standardize suggestion
    if (numCols.length > 0) {
      list.push({
        id: "standardize", type: "standardize",
        title: "Enable standardization",
        desc: "Z-score scaling improves distance-based models (KNN, SVM) and linear models. Tree models are unaffected.",
        applied: standardize,
        actionLabel: "Enable",
        onApply: () => setStandardize(true),
      });
    }

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzed, target, dropCols, mvNum, fixSkewness, standardize, encodeMethod]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <div style={{
        fontSize: "0.72rem", fontWeight: 700, color: ACCENT,
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: "0.6rem",
        display: "flex", alignItems: "center", gap: "0.5rem",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="7" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.6" fill={ACCENT} />
        </svg>
        Smart Recommendations
      </div>

      {recs.length === 0 ? (
        <div style={{ padding: "1rem", borderRadius: 10, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", fontSize: "0.75rem", color: "#4ade80" }}>
          Dataset looks clean — no critical issues detected.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recs.map(rec => (
            <div key={rec.id} style={{
              padding: "0.65rem 0.8rem", borderRadius: 10,
              background: rec.applied ? "rgba(74,222,128,0.05)" : CARD_BG,
              border: `1px solid ${rec.applied ? "rgba(74,222,128,0.2)" : "var(--border)"}`,
              transition: "border-color 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <RecTypeIcon type={rec.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {rec.title}
                    {rec.applied && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                        <polyline points="1.5,6 4.5,9 10.5,2.5" />
                      </svg>
                    )}
                  </div>
                  <p style={{ fontSize: "0.67rem", color: "var(--text3)", margin: 0, lineHeight: 1.55 }}>{rec.desc}</p>
                  {rec.actions ? (
                    <div style={{ marginTop: "0.45rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {rec.actions.map(a => (
                        <button
                          key={a.label}
                          onClick={a.onApply}
                          style={{
                            padding: "2px 10px", borderRadius: 9999, fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
                            background: a.active ? `${ACCENT}28` : `${ACCENT}14`,
                            border: `1px solid ${a.active ? ACCENT + "80" : ACCENT + "40"}`,
                            color: ACCENT, display: "flex", alignItems: "center", gap: "0.3rem",
                            transition: "box-shadow 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 10px ${ACCENT}44`; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                        >
                          {a.active && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : !rec.applied && rec.onApply ? (
                    <button
                      onClick={rec.onApply}
                      style={{
                        marginTop: "0.45rem", padding: "2px 10px", borderRadius: 9999,
                        fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
                        background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`, color: ACCENT,
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 10px ${ACCENT}44`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {rec.actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
