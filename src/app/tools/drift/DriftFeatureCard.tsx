"use client";

import { useState } from "react";
import { FeatureDrift, levelColor } from "./driftTypes";
import { NumericHistogram, CategoricalBars, CDFChart } from "./DriftCharts";
import { PercentileTable, PSIWaterfall } from "./DriftExtraCharts";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number | undefined | null, decimals = 3): string {
  return v == null ? "—" : v.toFixed(decimals);
}

function InfoIcon({ tip }: { tip: string }) {
  return (
    <span title={tip} style={{ cursor: "help", flexShrink: 0, display: "inline-flex" }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="5" />
        <line x1="6" y1="5.5" x2="6" y2="8" />
        <circle cx="6" cy="4" r="0.5" fill="var(--text3)" stroke="none" />
      </svg>
    </span>
  );
}

// ── Metric cell ────────────────────────────────────────────────────────────────

function MetricCell({ label, value, color, tip }: { label: string; value: string; color?: string; tip?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: "0.52rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</span>
        {tip && <InfoIcon tip={tip} />}
      </div>
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── Stats comparison table ─────────────────────────────────────────────────────

function StatsTable({ f }: { f: FeatureDrift }) {
  const hasPartialNulls = f.null_rate > 0 && f.null_rate < 1 && f.n_recent > 0;
  const nullPct = (f.null_rate * 100).toFixed(0);

  const rows: { label: string; ref: string; batch: string; highlight?: boolean }[] = [
    {
      label: "Mean",
      ref: fmt(f.ref_mean),
      batch: fmt(f.recent_mean),
      highlight: f.ref_mean != null && f.recent_mean != null
        && Math.abs(f.recent_mean - f.ref_mean) / (Math.abs(f.ref_mean) + 1e-9) > 0.1,
    },
    {
      label: "Std Dev",
      ref: fmt(f.ref_std),
      batch: fmt(f.recent_std),
      highlight: f.ref_std != null && f.recent_std != null
        && Math.abs(f.recent_std - f.ref_std) / (Math.abs(f.ref_std) + 1e-9) > 0.2,
    },
  ];

  return (
    <div>
      <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
        Reference vs Observed Stats
        <InfoIcon tip="Reference = training baseline. Observed = this batch. Nulls are excluded before computing batch stats — '—' means no non-null values existed." />
      </div>

      {/* Null exclusion note */}
      {hasPartialNulls && (
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", padding: "4px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 8, borderLeft: "2px solid #fbbf2444" }}>
          Batch stats computed on <strong style={{ color: "var(--text2)" }}>{f.n_recent} non-null rows</strong> ({nullPct}% nulls excluded).
          Mean/std differences may be partly explained by which rows were non-null.
        </div>
      )}
      {f.null_rate >= 1 && (
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", padding: "4px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 8, borderLeft: "2px solid #f8717144" }}>
          All batch values are null — no non-null rows to compute stats from. Null rate shift is the signal here.
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", fontWeight: 600, color: "var(--text3)", padding: "3px 0", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.05em" }} />
            <th style={{ textAlign: "right", fontWeight: 600, color: "var(--text3)", padding: "3px 8px", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Reference (training)
            </th>
            <th style={{ textAlign: "right", fontWeight: 600, color: "var(--text3)", padding: "3px 0", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Observed (batch{hasPartialNulls ? `, n=${f.n_recent}` : ""})
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <td style={{ padding: "5px 0", color: "var(--text2)", fontWeight: 500 }}>{r.label}</td>
              <td style={{ textAlign: "right", padding: "5px 8px", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{r.ref}</td>
              <td style={{ textAlign: "right", padding: "5px 0", fontVariantNumeric: "tabular-nums", fontWeight: r.highlight ? 700 : 400, color: r.highlight ? "#fbbf24" : (r.batch === "—" ? "var(--text3)" : "var(--text)") }}>
                {r.batch}{r.highlight && r.batch !== "—" && " ⚠"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Gauge bar ──────────────────────────────────────────────────────────────────

function GaugeBar({ label, value, max = 1, lowT = 0.1, highT = 0.25, tip }: {
  label: string; value: number; max?: number; lowT?: number; highT?: number; tip?: string;
}) {
  const pct   = Math.min(value / max, 1) * 100;
  const color = value >= highT ? "#f87171" : value >= lowT ? "#fbbf24" : "#34d399";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: "0.57rem", color: "var(--text3)", fontWeight: 600 }}>{label}</span>
          {tip && <InfoIcon tip={tip} />}
        </div>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 4, transition: "width 0.5s ease" }} />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: `${(lowT / max) * 100}%`, width: 1.5, background: "#fbbf2455" }} />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: `${(highT / max) * 100}%`, width: 1.5, background: "#f8717155" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.47rem", color: "var(--text3)" }}>
        <span>0</span>
        <span style={{ color: "#fbbf2477" }}>≥{lowT} medium</span>
        <span style={{ color: "#f8717177" }}>≥{highT} high</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ── Main feature card ──────────────────────────────────────────────────────────

export default function DriftFeatureCard({ f }: { f: FeatureDrift }) {
  const [open,      setOpen]      = useState(f.drift_level === "high");
  const [showExtra, setShowExtra] = useState(false);
  const lc = levelColor(f.drift_level);
  const highNull = f.null_rate >= 0.8;

  return (
    <div style={{
      border: `1px solid ${f.drift_level !== "low" ? lc + "44" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 10, overflow: "hidden",
      boxShadow: f.drift_level === "high" ? `0 0 14px ${lc}14` : "none",
    }}>
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%",
        background: f.drift_level === "high" ? `${lc}0b` : f.drift_level === "medium" ? `${lc}06` : "transparent",
        border: "none", cursor: "pointer",
        padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.65rem",
        color: "var(--text)", textAlign: "left",
      }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--text3)", flexShrink: 0 }}>
          <path d="M3 1.5l4 4-4 4" />
        </svg>
        <span style={{ fontSize: "0.76rem", fontWeight: 600, flex: 1 }}>{f.label}</span>
        {highNull && <span style={{ fontSize: "0.58rem", color: "#fbbf24" }} title="Null rate ≥ 80% in batch — distribution unreliable">⚠ high nulls</span>}
        <span style={{ fontSize: "0.58rem", color: "var(--text3)", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>{f.type}</span>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 9px", borderRadius: 9999, background: `${lc}18`, border: `1px solid ${lc}44`, color: lc }}>
          {f.drift_level.toUpperCase()} · {(f.drift_score * 100).toFixed(0)}%
        </span>
      </button>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "1.35rem" }}>

          {/* High-null warning */}
          {highNull && (
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.65rem 0.85rem", background: "#fbbf2410", border: "1px solid #fbbf2430", borderRadius: 8, fontSize: "0.67rem", color: "#fbbf24" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M7 1.5l5.5 9.5H1.5L7 1.5z" /><line x1="7" y1="6" x2="7" y2="8.5" /><circle cx="7" cy="10" r="0.6" fill="#fbbf24" stroke="none" />
              </svg>
              <span>
                <strong>Null rate {(f.null_rate * 100).toFixed(0)}% in batch.</strong>{" "}
                Distribution comparison is unreliable — the null rate shift itself is the primary drift signal here.
                {f.recent_mean == null && " Batch stats not available because insufficient non-null values exist."}
              </span>
            </div>
          )}

          {/* Metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.75rem 1.25rem" }}>
            <MetricCell label="PSI" value={f.psi.toFixed(3)} color={levelColor(f.psi_level)}
              tip="Population Stability Index — measures how much the distribution has shifted. < 0.1 stable, 0.1–0.25 moderate, > 0.25 significant drift." />
            <MetricCell label="Null Rate" value={`${(f.null_rate * 100).toFixed(1)}%`}
              color={f.null_rate > 0.5 ? "#f87171" : f.null_rate > 0.1 ? "#fbbf24" : undefined}
              tip="Percentage of values that are null/missing in this batch. A spike here is itself a drift signal." />
            <MetricCell label="Batch n" value={f.n_recent.toLocaleString()}
              tip="Number of non-null rows in this batch for this feature." />
            {f.ks_stat != null && (
              <MetricCell label="KS Stat" value={f.ks_stat.toFixed(3)}
                color={f.ks_pvalue != null && f.ks_pvalue < 0.05 ? "#f87171" : "#34d399"}
                tip="Kolmogorov-Smirnov test statistic — maximum gap between training and batch CDFs. Higher = more separation." />
            )}
            {f.ks_pvalue != null && (
              <MetricCell label="KS p-value" value={f.ks_pvalue < 0.001 ? "< 0.001" : f.ks_pvalue.toFixed(3)}
                color={f.ks_pvalue < 0.05 ? "#f87171" : "#34d399"}
                tip="Statistical significance of the KS test. p < 0.05 means the distributions are significantly different." />
            )}
          </div>

          {/* Stats comparison table (numeric only) */}
          {f.type === "numeric" && <StatsTable f={f} />}

          {/* PSI gauge */}
          <GaugeBar label="PSI — Population Stability Index" value={f.psi} lowT={0.1} highT={0.25}
            tip="< 0.1: low (stable) | 0.1–0.25: moderate | > 0.25: high (retrain recommended)" />

          {/* KS gauge */}
          {f.ks_stat != null && (
            <GaugeBar label="KS Statistic — Kolmogorov-Smirnov Test" value={f.ks_stat} lowT={0.1} highT={0.3}
              tip="Max distance between training vs batch cumulative distributions. Paired with p-value above." />
          )}

          {/* KS significance note */}
          {f.ks_pvalue != null && (
            <div style={{ fontSize: "0.6rem", color: f.ks_pvalue < 0.05 ? "#f87171" : "#34d399", padding: "0.4rem 0.75rem", borderRadius: 7, background: f.ks_pvalue < 0.05 ? "#f8717110" : "#34d39910", border: `1px solid ${f.ks_pvalue < 0.05 ? "#f8717130" : "#34d39930"}` }}>
              {f.ks_pvalue < 0.05
                ? `KS test: distributions are statistically different (p = ${f.ks_pvalue.toFixed(3)})`
                : `KS test: no statistically significant difference detected (p = ${f.ks_pvalue.toFixed(3)} ≥ 0.05)`}
            </div>
          )}

          {/* Numeric histogram */}
          {f.type === "numeric" && f.histogram && f.histogram.length > 0 && !highNull && (
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                Distribution Comparison
                <InfoIcon tip="Side-by-side view of training vs batch value distributions. Diverging shapes indicate drift." />
              </div>
              <NumericHistogram bins={f.histogram} />
            </div>
          )}

          {/* CDF · Percentiles · PSI breakdown (expandable) */}
          {f.type === "numeric" && f.histogram && f.histogram.length > 0 && !highNull && (
            <>
              <button onClick={() => setShowExtra(x => !x)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: "0.6rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: 4,
                textDecoration: "underline", textUnderlineOffset: 2,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                  style={{ transform: showExtra ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                  <path d="M2.5 2.5l5 2.5-5 2.5" />
                </svg>
                {showExtra ? "Hide CDF · Percentiles · PSI" : "Show CDF · Percentiles · PSI breakdown"}
              </button>
              {showExtra && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  <CDFChart bins={f.histogram} ksLabel={f.ks_stat} />
                  <PSIWaterfall bins={f.histogram} psi={f.psi} />
                  {f.ref_pct && f.recent_pct && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <PercentileTable f={f} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Categorical bars */}
          {f.type === "categorical" && f.options && !f.high_cardinality && (
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                Category Frequency Shift
                <InfoIcon tip="How the proportion of each category changed from training to this batch. 'pp' = percentage points." />
              </div>
              <CategoricalBars f={f} />
            </div>
          )}

          {f.high_cardinality && (
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)" }}>
              High-cardinality column — per-category breakdown not shown. Use PSI and KS gauges above as drift signals.
            </div>
          )}
        </div>
      )}
    </div>
  );
}