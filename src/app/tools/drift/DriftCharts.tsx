"use client";

import { FeatureDrift, ACCENT } from "./driftTypes";

// ── Smooth curve helper ────────────────────────────────────────────────────────

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
}

function fillArea(pts: [number, number][], baseY: number): string {
  const line = smoothPath(pts);
  if (!line || pts.length < 2) return "";
  return `${line} L${pts[pts.length - 1][0].toFixed(1)},${baseY} L${pts[0][0].toFixed(1)},${baseY} Z`;
}

// ── Numeric histogram with smooth density overlay ──────────────────────────────

export function NumericHistogram({ bins }: { bins: NonNullable<FeatureDrift["histogram"]> }) {
  if (!bins.length) return null;

  const VW = 400, VH = 140;
  const PAD = { l: 32, r: 6, t: 6, b: 20 };
  const CW = VW - PAD.l - PAD.r;
  const CH = VH - PAD.t - PAD.b;
  const baseY = PAD.t + CH;

  const maxH = Math.max(...bins.flatMap(b => [b.ref_h, b.actual_h]), 0.001);
  const n = bins.length;
  const BW = CW / n;
  const BAR = BW * 0.4;

  const scaleY = (h: number) => PAD.t + CH - (h / maxH) * CH;

  const refBars  = bins.map((b, i) => ({ x: PAD.l + i * BW + BW * 0.05, y: scaleY(b.ref_h),    h: (b.ref_h    / maxH) * CH, tip: `Training ${(b.ref_h    * 100).toFixed(1)}% | [${b.lo.toFixed(2)}, ${b.hi.toFixed(2)}]` }));
  const batBars  = bins.map((b, i) => ({ x: PAD.l + i * BW + BW * 0.53, y: scaleY(b.actual_h), h: (b.actual_h / maxH) * CH, tip: `Batch ${(b.actual_h * 100).toFixed(1)}% | [${b.lo.toFixed(2)}, ${b.hi.toFixed(2)}]` }));
  const refPts  = bins.map((b, i): [number, number] => [PAD.l + (i + 0.5) * BW, scaleY(b.ref_h)]);
  const batPts  = bins.map((b, i): [number, number] => [PAD.l + (i + 0.5) * BW, scaleY(b.actual_h)]);

  const refLine = smoothPath(refPts);
  const batLine = smoothPath(batPts);
  const refFill = fillArea(refPts, baseY);
  const batFill = fillArea(batPts, baseY);

  const grid = [0.25, 0.5, 0.75, 1.0];

  return (
    <div>
      <div style={{ display: "flex", gap: "1.2rem", fontSize: "0.55rem", color: "var(--text3)", marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="20" height="8"><rect x="0" y="2" width="10" height="4" fill={`${ACCENT}35`} rx="1" /><path d={`M0,4 Q5,1 10,4`} fill="none" stroke={`${ACCENT}70`} strokeWidth="1.5" strokeDasharray="3,2" /></svg>
          Training (ref)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="20" height="8"><rect x="0" y="2" width="10" height="4" fill={`${ACCENT}bb`} rx="1" /><path d={`M0,4 Q5,1 10,4`} fill="none" stroke={ACCENT} strokeWidth="1.5" /></svg>
          Batch (obs)
        </span>
        <span style={{ marginLeft: "auto", fontStyle: "italic" }}>dashed = ref curve · solid = batch curve</span>
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label="Distribution histogram">
        {/* Grid lines + y-axis labels */}
        {grid.map(t => {
          const y = PAD.t + CH - t * CH;
          return (
            <g key={t}>
              <line x1={PAD.l} x2={VW - PAD.r} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.8} />
              <text x={PAD.l - 3} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize="8">{(t * 100).toFixed(0)}%</text>
            </g>
          );
        })}

        {/* Baseline */}
        <line x1={PAD.l} x2={VW - PAD.r} y1={baseY} y2={baseY} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />

        {/* Reference bars */}
        {refBars.map((b, i) => (
          <rect key={`r${i}`} x={b.x} y={b.y} width={BAR} height={Math.max(b.h, 1)} fill={`${ACCENT}35`} rx={1.5}>
            <title>{b.tip}</title>
          </rect>
        ))}

        {/* Batch bars */}
        {batBars.map((b, i) => (
          <rect key={`b${i}`} x={b.x} y={b.y} width={BAR} height={Math.max(b.h, 1)} fill={`${ACCENT}bb`} rx={1.5}>
            <title>{b.tip}</title>
          </rect>
        ))}

        {/* Smooth density fill — ref */}
        {refFill && <path d={refFill} fill={`${ACCENT}10`} />}
        {/* Smooth density fill — batch */}
        {batFill && <path d={batFill} fill={`${ACCENT}15`} />}

        {/* Smooth density line — ref (dashed) */}
        {refLine && (
          <path d={refLine} fill="none" stroke={`${ACCENT}70`} strokeWidth={1.8}
            strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5,3" />
        )}
        {/* Smooth density line — batch (solid) */}
        {batLine && (
          <path d={batLine} fill="none" stroke={ACCENT} strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* X-axis labels */}
        {[0, Math.floor(n / 2), n - 1].map(i => (
          <text key={i} x={PAD.l + (i + 0.5) * BW} y={VH - 4} textAnchor="middle" fill="var(--text3)" fontSize="8">
            {i === 0 ? bins[0].lo.toFixed(1) : i === n - 1 ? bins[n - 1].hi.toFixed(1) : ((bins[0].lo + bins[n - 1].hi) / 2).toFixed(1)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Categorical bars ───────────────────────────────────────────────────────────

export function CategoricalBars({ f }: { f: FeatureDrift }) {
  if (!f.options?.length) return null;
  const maxVal = Math.max(...f.options.flatMap(o => [f.ref_dist?.[o] ?? 0, f.recent_dist?.[o] ?? 0]), 0.001);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.55rem", color: "var(--text3)" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: `${ACCENT}40`, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Training freq</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: ACCENT, borderRadius: 2, marginRight: 3, verticalAlign: "middle" }} />Batch freq</span>
        {f.cat_baseline === "uniform" && <span style={{ color: "#fbbf24" }}>⚠ uniform fallback — no training freq stored</span>}
      </div>
      {f.options.map(opt => {
        const ref  = f.ref_dist?.[opt] ?? 0;
        const rec  = f.recent_dist?.[opt] ?? 0;
        const diff = rec - ref;
        const refW = (ref / maxVal) * 100;
        const recW = (rec / maxVal) * 100;
        const dc   = Math.abs(diff) > 0.1 ? (diff > 0 ? "#34d399" : "#f87171") : "var(--text3)";
        return (
          <div key={opt}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.64rem", color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: dc, fontVariantNumeric: "tabular-nums" }}>
                {diff > 0 ? "+" : ""}{(diff * 100).toFixed(1)} pp
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.5rem", color: "var(--text3)", width: 16, flexShrink: 0 }}>ref</span>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${refW}%`, background: `linear-gradient(90deg, ${ACCENT}55, ${ACCENT}33)`, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: "0.52rem", color: "var(--text3)", width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(ref * 100).toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.5rem", color: "var(--text3)", width: 16, flexShrink: 0 }}>now</span>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${recW}%`, background: `linear-gradient(90deg, ${ACCENT}bb, ${ACCENT})`, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: "0.52rem", color: dc, width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(rec * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}