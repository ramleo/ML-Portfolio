"use client";
import { useRef, useState, useEffect } from "react";

const ACCENT = "#a78bfa";

export function mdToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0.75rem 0"/>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:0.9rem 0 0.25rem;font-size:0.84rem;font-weight:700;color:var(--text)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:1rem 0 0.3rem;font-size:0.9rem;font-weight:700;color:var(--text)">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:700">$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em style="color:var(--text);font-style:italic">$1</em>')
    .replace(/\n\n/g, '</p><p style="margin:0.5rem 0">')
    .replace(/^(?!<h[234]|<\/p>|<p)(.+)$/gm, '$1')
    .replace(/^/, '<p style="margin:0">')
    .replace(/$/, '</p>');
}
const ACCENT_GREEN = "#34d399";

interface TrialEntry { trial: number; value: number }

interface TrialHistoryProps {
  trials: TrialEntry[];
  bestTrial: TrialEntry | null;
  primaryMetricLabel?: string;
  secondaryTrials?: TrialEntry[];
  secondaryMetricLabel?: string;
}

export function TrialHistoryChart({ trials, bestTrial, primaryMetricLabel, secondaryTrials, secondaryMetricLabel }: TrialHistoryProps) {
  if (!trials.length) return null;

  const W = 340, H = 180, PL = 10, PR = 10, PT = 12, PB = 24;
  const cw = W - PL - PR, ch = H - PT - PB;

  const hasSecondary = !!(secondaryTrials && secondaryTrials.length > 0 && secondaryMetricLabel);

  // Combined Y range from both primary and secondary if present
  const allValues = [...trials.map(t => t.value), ...(hasSecondary ? secondaryTrials!.map(t => t.value) : [])];
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yRange = yMax - yMin || 0.01;

  const xStep = cw / Math.max(trials.length - 1, 1);
  const toX = (i: number) => PL + i * xStep;
  const toY = (v: number) => PT + ch - ((v - yMin) / yRange) * ch;

  // running best
  let runBest = -Infinity;
  const bestLine = trials.map(t => {
    if (t.value > runBest) runBest = t.value;
    return runBest;
  });

  const trialPolyline = trials.map((t, i) => `${toX(i)},${toY(t.value)}`).join(" ");
  const bestPolyline  = bestLine.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  // Secondary polyline — map secondary trials by index position
  const secondaryPolyline = hasSecondary
    ? secondaryTrials!.map((t, i) => `${toX(i)},${toY(t.value)}`).join(" ")
    : null;

  return (
    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.9rem 1rem" }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
        Trial History
      </div>
      {bestTrial && (
        <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginBottom: "0.5rem" }}>
          Best: Trial <span style={{ color: ACCENT, fontWeight: 700 }}>#{bestTrial.trial}</span> — score <span style={{ color: ACCENT, fontWeight: 700 }}>{bestTrial.value.toFixed(4)}</span>
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PT + ch * (1 - f);
          const val = yMin + yRange * f;
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={PL - 2} y={y + 3.5} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.3)">{val.toFixed(2)}</text>
            </g>
          );
        })}
        {/* X axis labels */}
        {trials.filter((_, i) => i === 0 || i === trials.length - 1 || (i + 1) % 10 === 0).map(t => {
          const i = trials.indexOf(t);
          return <text key={t.trial} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{t.trial}</text>;
        })}
        {/* Running best line */}
        <polyline points={bestPolyline} fill="none" stroke={`${ACCENT}50`} strokeWidth="1.5" strokeDasharray="4 2" />
        {/* Trial score line */}
        <polyline points={trialPolyline} fill="none" stroke={`${ACCENT}88`} strokeWidth="1.5" />
        {/* Secondary metric overlay */}
        {hasSecondary && secondaryPolyline && (
          <polyline points={secondaryPolyline} fill="none" stroke={ACCENT_GREEN} strokeWidth="1.5" strokeDasharray="3 2" />
        )}
        {/* Dots */}
        {trials.map((t, i) => {
          const isBest = bestTrial !== null && t.trial === bestTrial.trial;
          return (
            <circle key={t.trial} cx={toX(i)} cy={toY(t.value)} r={isBest ? 5 : 2.5}
              fill={isBest ? ACCENT : `${ACCENT}99`}
              stroke={isBest ? "rgba(255,255,255,0.3)" : "none"}
              strokeWidth={isBest ? 1.5 : 0}
              style={isBest ? { filter: `drop-shadow(0 0 4px ${ACCENT})` } : {}}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={`${ACCENT}88`} strokeWidth="1.5" /></svg>
          {primaryMetricLabel ? primaryMetricLabel : "Trial scores"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={`${ACCENT}50`} strokeWidth="1.5" strokeDasharray="4 2" /></svg>
          Running best
        </div>
        {hasSecondary && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={ACCENT_GREEN} strokeWidth="1.5" strokeDasharray="3 2" /></svg>
            Secondary: {secondaryMetricLabel}
          </div>
        )}
      </div>
    </div>
  );
}

interface LearningCurveProps {
  trainSizes: number[];
  trainScores: number[];
  valScores: number[];
  metricLabel: string;
}

export function LearningCurveChart({ trainSizes, trainScores, valScores, metricLabel }: LearningCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgW, setSvgW] = useState(600);

  useEffect(() => {
    const update = () => { if (svgRef.current) setSvgW(svgRef.current.getBoundingClientRect().width); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const H = 160, PL = 34, PR = 12, PT = 10, PB = 22;
  const cw = svgW - PL - PR, ch = H - PT - PB;
  const xInset = 10; // pushes first/last points away from axis edges

  const validTrain = trainScores.filter(v => v != null && isFinite(v));
  const validVal   = valScores.filter(v => v != null && isFinite(v));
  const allValid   = [...validTrain, ...validVal];
  const rawMin = allValid.length ? Math.min(...allValid) : 0;
  const rawMax = allValid.length ? Math.max(...allValid) : 1;
  const pad  = Math.max((rawMax - rawMin) * 0.15, 0.05);
  const yMin = Math.max(0, rawMin - pad);
  const yMax = Math.min(1, rawMax + pad);
  const yRange = yMax - yMin || 0.1;

  const xMin = trainSizes[0] ?? 0;
  const xMax = trainSizes[trainSizes.length - 1] ?? 1;
  const xRange = xMax - xMin || 1;

  const toX = (s: number) => PL + xInset + ((s - xMin) / xRange) * (cw - 2 * xInset);
  const toY = (v: number) => PT + ch - ((v - yMin) / yRange) * ch;

  const trainPts = trainSizes.map((s, i) => trainScores[i] != null && isFinite(trainScores[i]) ? `${toX(s)},${toY(trainScores[i])}` : null).filter(Boolean).join(" ");
  const valPts   = trainSizes.map((s, i) => valScores[i]   != null && isFinite(valScores[i])   ? `${toX(s)},${toY(valScores[i])}` : null).filter(Boolean).join(" ");
  const hasVal   = validVal.length > 0;

  return (
    <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.7rem 1rem" }}>
      <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginBottom: "0.4rem" }}>
        {metricLabel} vs training set size
      </div>
      <svg ref={svgRef} width="100%" height={H}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PT + ch * (1 - f);
          const val = yMin + yRange * f;
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={svgW - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.35)">{val.toFixed(2)}</text>
            </g>
          );
        })}
        {trainSizes.map(s => (
          <text key={s} x={toX(s)} y={H - 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.35)">{s}</text>
        ))}
        {hasVal && <polyline points={valPts}   fill="none" stroke={`${ACCENT}55`} strokeWidth="1.5" strokeDasharray="5 3" />}
        <polyline points={trainPts} fill="none" stroke={ACCENT} strokeWidth="1.5" />
        {trainSizes.map((s, i) => (
          <g key={s}>
            {trainScores[i] != null && isFinite(trainScores[i]) && <circle cx={toX(s)} cy={toY(trainScores[i])} r={4} fill={ACCENT} />}
            {valScores[i]   != null && isFinite(valScores[i])   && <circle cx={toX(s)} cy={toY(valScores[i])}   r={4} fill={`${ACCENT}77`} />}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.35rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={ACCENT} strokeWidth="1.5" /></svg>
          Train
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "var(--text3)" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={`${ACCENT}55`} strokeWidth="1.5" strokeDasharray="5 3" /></svg>
          Validation
        </div>
      </div>
    </div>
  );
}
