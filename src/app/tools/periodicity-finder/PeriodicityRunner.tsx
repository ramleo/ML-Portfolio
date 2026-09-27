"use client";

import { useMemo, useState } from "react";
import { findPeriodicity, type PeriodicityResult, type Peak } from "./periodicityMath";

/** Deterministic sample: 8 weeks of event timestamps with a clear weekly rhythm
 *  (busy weekdays, quiet weekends) so the tool reports a ~7-day cycle. */
function sampleTimestamps(): string {
  const start = Date.UTC(2026, 0, 5, 0, 0, 0); // Monday
  const perDay = [14, 12, 10, 11, 9, 3, 2]; // Mon..Sun
  const out: string[] = [];
  for (let day = 0; day < 56; day++) {
    const count = perDay[day % 7];
    for (let e = 0; e < count; e++) {
      const ms = start + day * 86400000 + Math.floor(((e + 1) / (count + 1)) * 86400000);
      out.push(new Date(ms).toISOString());
    }
  }
  return out.join("\n");
}

type Verdict = { label: string; color: string; note: string };

function verdictFor(strength: number): Verdict {
  if (strength >= 8) {
    return { label: "Strong cycle", color: "#22c55e", note: "A dominant repeating cycle stands well above the noise." };
  }
  if (strength >= 4) {
    return { label: "Possible cycle", color: "#f59e0b", note: "A cycle is present but not strongly dominant — treat as a hint." };
  }
  return { label: "No clear periodicity", color: "#94a3b8", note: "No single cycle dominates; the data may be aperiodic or too short/noisy." };
}

function Spectrum({ spectrum, peaks, accent }: {
  spectrum: number[];
  peaks: Peak[];
  accent: string;
}) {
  // spectrum is bins 0..N/2; skip DC + the first trend bin for display.
  const half = spectrum.length - 1;
  const n = half * 2;
  const start = 2;
  const band = spectrum.slice(start);
  const max = Math.max(...band, 1e-9);
  const peakBins = new Set(peaks.map((p) => Math.round(n / p.periodSamples)));

  const W = 600;
  const H = 140;
  const count = band.length;
  const bw = W / count;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="Frequency spectrum of the series; taller bars are stronger cycles.">
      {band.map((v, i) => {
        const k = i + start;
        const h = (v / max) * (H - 20);
        const isPeak = peakBins.has(k);
        return (
          <rect key={k} x={i * bw} y={H - 12 - h} width={Math.max(bw - 0.5, 0.5)} height={h}
            fill={isPeak ? accent : "var(--text3)"} opacity={isPeak ? 1 : 0.35} />
        );
      })}
      <line x1={0} y1={H - 12} x2={W} y2={H - 12} stroke="var(--border)" strokeWidth={1} />
      <text x={2} y={H - 2} fontSize={9} fill="var(--text3)">longer cycles</text>
      <text x={W - 2} y={H - 2} fontSize={9} fill="var(--text3)" textAnchor="end">shorter cycles</text>
    </svg>
  );
}

export default function PeriodicityRunner({ accent }: { accent: string }) {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<PeriodicityResult | null>(null);

  const lineCount = useMemo(() => raw.split(/[\n,]+/).filter((s) => s.trim()).length, [raw]);

  const onAnalyze = () => setResult(findPeriodicity(raw));
  const onSample = () => { setRaw(sampleTimestamps()); setResult(null); };
  const onClear = () => { setRaw(""); setResult(null); };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Paste a series or a list of event times.</span>{" "}
        One value per line — plain numbers (treated as evenly spaced), or timestamps
        (ISO, a date, or a unix epoch). It finds the strongest repeating cycle via an FFT.
        Everything runs in your browser; nothing is uploaded.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
            Data — one value per line ({lineCount} lines)
          </span>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} rows={8}
            placeholder={"12\n15\n9\n...\n\nor\n\n2026-01-05T09:00:00Z\n2026-01-05T14:00:00Z\n..."}
            className="text-[12px] font-mono px-3 py-2 rounded-lg outline-none resize-y"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onAnalyze} disabled={lineCount < 8}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            Find periodicity
          </button>
          <button onClick={onSample}
            className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Load sample
          </button>
          {raw && (
            <button onClick={onClear}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
          {lineCount > 0 && lineCount < 8 && (
            <span className="text-[11px]" style={{ color: "#f59e0b" }}>Need at least 8 lines.</span>
          )}
        </div>
      </div>

      {result && !result.ok && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {result.error}
        </div>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-4">
          {(() => {
            const top = result.peaks[0];
            const v = verdictFor(top ? top.strength : 0);
            return (
              <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: `1px solid ${v.color}44` }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[13px] font-bold px-3 py-1 rounded-full"
                    style={{ background: `${v.color}1e`, color: v.color, border: `1px solid ${v.color}55` }}>
                    {v.label}
                  </span>
                  {top && (
                    <span className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                      Dominant cycle: {top.periodLabel}
                    </span>
                  )}
                  <span className="text-[11px] ml-auto px-2 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--text3)" }}>
                    {result.mode === "timestamps" ? `timestamps · ${result.n} events` : `numeric series · ${result.n} points`}
                  </span>
                </div>
                <p className="text-[12px] mt-2" style={{ color: "var(--text2)" }}>{v.note}</p>
              </div>
            );
          })()}

          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text3)" }}>Frequency spectrum</div>
            <Spectrum spectrum={result.spectrum} peaks={result.peaks} accent={accent} />
          </div>

          {result.peaks.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5 border-b text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Dominant cycles ({result.peaks.length})
              </div>
              <ul>
                {result.peaks.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[11px] w-5 shrink-0" style={{ color: "var(--text3)" }}>#{i + 1}</span>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{p.periodLabel}</span>
                    <span className="text-[11px] ml-auto" style={{ color: "var(--text3)" }}>
                      strength {p.strength.toFixed(1)}× above noise
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
