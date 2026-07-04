"use client";

import { useState } from "react";
import { FeatureDrift, levelColor, ACCENT } from "./driftTypes";

// ── Metric cell ────────────────────────────────────────────────────────────────

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: "0.52rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: color ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── Gauge bar ──────────────────────────────────────────────────────────────────

function GaugeBar({
  label, value, max = 1, lowThresh = 0.1, highThresh = 0.25,
}: {
  label: string; value: number; max?: number; lowThresh?: number; highThresh?: number;
}) {
  const pct   = Math.min(value / max, 1) * 100;
  const color = value >= highThresh ? "#f87171" : value >= lowThresh ? "#fbbf24" : "#34d399";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.57rem", color: "var(--text3)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: `${(lowThresh / max) * 100}%`, width: 1.5, background: "#fbbf2466", borderRadius: 1 }} />
        <div style={{ position: "absolute", top: -3, bottom: -3, left: `${(highThresh / max) * 100}%`, width: 1.5, background: "#f8717166", borderRadius: 1 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", color: "var(--text3)" }}>
        <span>0</span>
        <span style={{ color: "#fbbf2488" }}>medium ≥ {lowThresh}</span>
        <span style={{ color: "#f8717188" }}>high ≥ {highThresh}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ── Numeric histogram ──────────────────────────────────────────────────────────

function NumericHistogram({ bins }: { bins: NonNullable<FeatureDrift["histogram"]> }) {
  if (!bins.length) return null;
  const maxH = Math.max(...bins.flatMap(b => [b.ref_h, b.actual_h]), 0.001);
  const H    = 72;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.55rem", color: "var(--text3)", marginBottom: 6 }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: `${ACCENT}40`, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Training (reference)</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: ACCENT, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Batch (production)</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: H + 14, padding: "0 2px" }}>
        {bins.map((b, i) => {
          const rh = (b.ref_h / maxH) * H;
          const bh = (b.actual_h / maxH) * H;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: H }}>
                <div title={`ref: ${(b.ref_h * 100).toFixed(1)}%`}
                  style={{ flex: 1, height: Math.max(rh, 1), background: `${ACCENT}35`, borderRadius: "2px 2px 0 0", minHeight: 1 }} />
                <div title={`batch: ${(b.actual_h * 100).toFixed(1)}%`}
                  style={{ flex: 1, height: Math.max(bh, 1), background: ACCENT, borderRadius: "2px 2px 0 0", minHeight: 1, opacity: 0.9 }} />
              </div>
              {(i === 0 || i === bins.length - 1 || i === Math.floor(bins.length / 2)) && (
                <div style={{ fontSize: "0.44rem", color: "var(--text3)", textAlign: "center", overflow: "hidden", marginTop: 2 }}>
                  {i === 0 ? b.lo.toFixed(1) : i === bins.length - 1 ? b.hi.toFixed(1) : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Categorical bars ───────────────────────────────────────────────────────────

function CategoricalBars({ f }: { f: FeatureDrift }) {
  if (!f.options?.length) return null;
  const maxVal = Math.max(...f.options.flatMap(o => [f.ref_dist?.[o] ?? 0, f.recent_dist?.[o] ?? 0]), 0.001);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.55rem", color: "var(--text3)" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: `${ACCENT}40`, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Training freq</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: ACCENT, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Batch freq</span>
        {f.cat_baseline === "uniform" && <span style={{ color: "#fbbf24" }}>⚠ uniform fallback</span>}
      </div>
      {f.options.map(opt => {
        const ref   = f.ref_dist?.[opt] ?? 0;
        const rec   = f.recent_dist?.[opt] ?? 0;
        const diff  = rec - ref;
        const refW  = (ref / maxVal) * 100;
        const recW  = (rec / maxVal) * 100;
        const dc    = Math.abs(diff) > 0.1 ? (diff > 0 ? "#34d399" : "#f87171") : "var(--text3)";
        return (
          <div key={opt}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: "0.62rem", color: "var(--text2)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
              <span style={{ fontSize: "0.58rem", fontWeight: 700, color: dc, fontVariantNumeric: "tabular-nums" }}>{diff > 0 ? "+" : ""}{(diff * 100).toFixed(1)}pp</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${refW}%`, background: `${ACCENT}40`, borderRadius: 3 }} />
                <span style={{ position: "absolute", right: 3, top: 0, fontSize: "0.44rem", color: "var(--text3)", lineHeight: "7px" }}>{(ref * 100).toFixed(1)}%</span>
              </div>
              <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${recW}%`, background: ACCENT, borderRadius: 3, opacity: 0.9 }} />
                <span style={{ position: "absolute", right: 3, top: 0, fontSize: "0.44rem", color: "var(--text3)", lineHeight: "7px" }}>{(rec * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main feature card ──────────────────────────────────────────────────────────

export default function DriftFeatureCard({ f }: { f: FeatureDrift }) {
  const [open, setOpen] = useState(f.drift_level === "high");
  const lc = levelColor(f.drift_level);

  const meanShift = f.ref_mean != null && f.recent_mean != null
    ? ((f.recent_mean - f.ref_mean) / (Math.abs(f.ref_mean) + 1e-9)) * 100
    : null;

  return (
    <div style={{
      border: `1px solid ${f.drift_level !== "low" ? lc + "44" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 10, overflow: "hidden",
      boxShadow: f.drift_level === "high" ? `0 0 12px ${lc}18` : "none",
    }}>
      {/* ── Header ── */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%",
        background: f.drift_level === "high" ? `${lc}0a` : f.drift_level === "medium" ? `${lc}06` : "transparent",
        border: "none", cursor: "pointer",
        padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.65rem",
        color: "var(--text)", textAlign: "left",
      }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--text3)", flexShrink: 0 }}>
          <path d="M3 1.5l4 4-4 4" />
        </svg>
        <span style={{ fontSize: "0.76rem", fontWeight: 600, flex: 1 }}>{f.label}</span>
        {meanShift !== null && Math.abs(meanShift) > 5 && (
          <span style={{ fontSize: "0.6rem", color: meanShift > 0 ? "#34d399" : "#f87171", fontVariantNumeric: "tabular-nums" }}>
            {meanShift > 0 ? "▲" : "▼"} {Math.abs(meanShift).toFixed(1)}%
          </span>
        )}
        <span style={{ fontSize: "0.58rem", color: "var(--text3)", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>{f.type}</span>
        <span style={{
          fontSize: "0.6rem", fontWeight: 700, padding: "2px 9px", borderRadius: 9999,
          background: `${lc}18`, border: `1px solid ${lc}44`, color: lc,
        }}>
          {f.drift_level.toUpperCase()} · {(f.drift_score * 100).toFixed(0)}%
        </span>
      </button>

      {/* ── Expanded ── */}
      {open && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.18)",
          padding: "1rem 1.1rem",
          display: "flex", flexDirection: "column", gap: "1.25rem",
        }}>
          {/* Metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "0.75rem 1.25rem" }}>
            <MetricCell label="PSI" value={f.psi.toFixed(3)} color={levelColor(f.psi_level)} />
            {f.ref_mean != null && <MetricCell label="Ref Mean" value={f.ref_mean.toFixed(3)} />}
            {f.recent_mean != null && (
              <MetricCell label="Batch Mean" value={f.recent_mean.toFixed(3)}
                color={meanShift !== null && Math.abs(meanShift) > 10 ? (meanShift > 0 ? "#34d399" : "#f87171") : undefined} />
            )}
            {f.ref_std != null && <MetricCell label="Ref Std" value={f.ref_std.toFixed(3)} />}
            {f.recent_std != null && <MetricCell label="Batch Std" value={f.recent_std.toFixed(3)} />}
            {f.ks_stat != null && (
              <MetricCell label="KS Statistic" value={f.ks_stat.toFixed(3)}
                color={f.ks_pvalue != null && f.ks_pvalue < 0.05 ? "#f87171" : "#34d399"} />
            )}
            {f.ks_pvalue != null && (
              <MetricCell label="KS p-value" value={f.ks_pvalue < 0.001 ? "< 0.001" : f.ks_pvalue.toFixed(3)}
                color={f.ks_pvalue < 0.05 ? "#f87171" : "#34d399"} />
            )}
            <MetricCell label="Null Rate" value={`${(f.null_rate * 100).toFixed(1)}%`}
              color={f.null_rate > 0.05 ? "#fbbf24" : undefined} />
            <MetricCell label="Batch n" value={f.n_recent.toLocaleString()} />
          </div>

          {/* PSI gauge */}
          <GaugeBar label="PSI — Population Stability Index" value={f.psi} max={1} lowThresh={0.1} highThresh={0.25} />

          {/* KS gauge */}
          {f.ks_stat != null && (
            <GaugeBar label="KS Statistic — Kolmogorov-Smirnov Test" value={f.ks_stat} max={1} lowThresh={0.1} highThresh={0.3} />
          )}

          {/* KS p-value significance note */}
          {f.ks_pvalue != null && (
            <div style={{ fontSize: "0.6rem", color: f.ks_pvalue < 0.05 ? "#f87171" : "#34d399", padding: "0.4rem 0.6rem", borderRadius: 6, background: f.ks_pvalue < 0.05 ? "#f8717110" : "#34d39910", border: `1px solid ${f.ks_pvalue < 0.05 ? "#f8717130" : "#34d39930"}` }}>
              KS test: {f.ks_pvalue < 0.05
                ? `Distributions are statistically different (p = ${f.ks_pvalue.toFixed(3)} < 0.05)`
                : `Distributions are not significantly different (p = ${f.ks_pvalue.toFixed(3)} ≥ 0.05)`}
            </div>
          )}

          {/* Numeric histogram */}
          {f.type === "numeric" && f.histogram && f.histogram.length > 0 && (
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Distribution Comparison</div>
              <NumericHistogram bins={f.histogram} />
            </div>
          )}

          {/* Categorical bars */}
          {f.type === "categorical" && f.options && !f.high_cardinality && (
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Category Frequency Shift</div>
              <CategoricalBars f={f} />
            </div>
          )}

          {f.high_cardinality && (
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)" }}>
              High-cardinality column — per-category breakdown not shown. Interpret via PSI and KS gauges above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}