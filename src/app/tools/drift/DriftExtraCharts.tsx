"use client";

import { FeatureDrift, ACCENT } from "./driftTypes";

// ── Percentile shift table ─────────────────────────────────────────────────────

export function PercentileTable({ f }: { f: FeatureDrift }) {
  if (!f.ref_pct || !f.recent_pct || f.ref_pct.length < 5) return null;
  const labels = ["P5", "P25", "P50", "P75", "P95"];

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Percentile Shift</div>
        <div style={{ fontSize: "0.55rem", color: "var(--text3)", marginTop: 2 }}>P5–P95 reference (training baseline) vs this batch. Yellow = &gt;15% relative shift. Robust to outliers unlike mean/std alone.</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.66rem" }}>
        <thead>
          <tr>
            {["Pct", "Reference", "Batch", "Delta"].map(h => (
              <th key={h} style={{ textAlign: h === "Pct" ? "left" : "right", fontWeight: 600, color: "var(--text3)", padding: "3px 6px 3px 0", fontSize: "0.57rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((lbl, i) => {
            const ref = f.ref_pct![i];
            const rec = f.recent_pct![i];
            const delta = rec - ref;
            const relChange = Math.abs(delta) / (Math.abs(ref) + 1e-9);
            const highlight = relChange > 0.15;
            const dc = delta > 0.001 ? "#34d399" : delta < -0.001 ? "#f87171" : "var(--text3)";
            return (
              <tr key={lbl} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "4px 6px 4px 0", color: "var(--text3)", fontWeight: 600 }}>{lbl}</td>
                <td style={{ textAlign: "right", padding: "4px 6px 4px 0", color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{ref.toFixed(3)}</td>
                <td style={{ textAlign: "right", padding: "4px 6px 4px 0", fontVariantNumeric: "tabular-nums", fontWeight: highlight ? 700 : 400, color: highlight ? "#fbbf24" : "var(--text)" }}>{rec.toFixed(3)}</td>
                <td style={{ textAlign: "right", padding: "4px 0", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: dc }}>
                  {delta > 0.001 ? "+" : ""}{delta.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── PSI bin waterfall ──────────────────────────────────────────────────────────
// Shows density difference (batch − ref) per bin. Positive = more batch density
// in that range, negative = less. Total magnitude = where PSI comes from.

export function PSIWaterfall({ bins, psi }: {
  bins: NonNullable<FeatureDrift["histogram"]>;
  psi: number;
}) {
  if (!bins.length) return null;

  const refTotal = bins.reduce((s, b) => s + b.ref_h, 0) || 1;
  const actTotal = bins.reduce((s, b) => s + b.actual_h, 0) || 1;

  const diffs = bins.map(b => (b.actual_h / actTotal) - (b.ref_h / refTotal));
  const maxAbs = Math.max(...diffs.map(Math.abs), 0.001);

  const VW = 400, VH = 90;
  const PAD = { l: 6, r: 6, t: 8, b: 20 };
  const CW = VW - PAD.l - PAD.r;
  const CH = VH - PAD.t - PAD.b;
  const midY = PAD.t + CH / 2;
  const n = bins.length;
  const BW = CW / n;
  const BAR_W = BW * 0.72;

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
          PSI Bin Breakdown
          <span style={{ fontSize: "0.55rem", color: psi > 0.25 ? "#f87171" : psi > 0.1 ? "#fbbf24" : "#34d399" }}>
            PSI = {psi.toFixed(3)}
          </span>
        </div>
        <div style={{ fontSize: "0.55rem", color: "var(--text3)", marginTop: 2 }}>
          Which value ranges drive the drift score. Orange = batch has more density here; blue = batch has less. Tall bars = biggest contributors to PSI.
        </div>
      </div>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", maxHeight: 110, display: "block" }} aria-label="PSI bin waterfall">
        {/* Zero baseline */}
        <line x1={PAD.l} x2={VW - PAD.r} y1={midY} y2={midY} stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />

        {/* +/- labels */}
        <text x={PAD.l} y={PAD.t + 7} fill="var(--text3)" fontSize="7">+more batch</text>
        <text x={PAD.l} y={VH - PAD.b - 2} fill="var(--text3)" fontSize="7">−less batch</text>

        {/* Bars */}
        {diffs.map((d, i) => {
          const barH = Math.abs(d) / maxAbs * (CH / 2 - 2);
          const positive = d >= 0;
          const x = PAD.l + i * BW + (BW - BAR_W) / 2;
          const y = positive ? midY - barH : midY;
          const color = positive ? `${ACCENT}cc` : "#60a5facc";
          return (
            <rect key={i} x={x} y={y} width={BAR_W} height={Math.max(barH, 1)} fill={color} rx={1.5}>
              <title>{`[${bins[i].lo.toFixed(2)}, ${bins[i].hi.toFixed(2)}]: ${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)}pp`}</title>
            </rect>
          );
        })}

        {/* X-axis labels */}
        {[0, Math.floor(n / 2), n - 1].map(i => (
          <text key={i} x={PAD.l + (i + 0.5) * BW} y={VH - 4} textAnchor="middle" fill="var(--text3)" fontSize="8">
            {i === 0 ? bins[0].lo.toFixed(1) : i === n - 1 ? bins[n - 1].hi.toFixed(1) : ((bins[0].lo + bins[n - 1].hi) / 2).toFixed(1)}
          </text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.54rem", color: "var(--text3)", marginTop: 3 }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: `${ACCENT}cc`, borderRadius: 1, marginRight: 3, verticalAlign: "middle" }} />Batch excess</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#60a5facc", borderRadius: 1, marginRight: 3, verticalAlign: "middle" }} />Batch deficit</span>
      </div>
    </div>
  );
}