"use client";

import { useKeystrokeCapture, PHRASE } from "./useKeystrokeCapture";
import type { RiskBand } from "./keystrokeAuthRisk";

const BAND_STYLE: Record<RiskBand, { label: string; color: string }> = {
  low: { label: "Low deviation — matches enrolled pattern", color: "#4ade80" },
  medium: { label: "Medium deviation — somewhat different rhythm", color: "#fbbf24" },
  high: { label: "High deviation — likely a different typist", color: "#f87171" },
};

function DwellFlightBars({ dwell, flight, accent }: { dwell: number[]; flight: number[]; accent: string }) {
  const maxDwell = Math.max(...dwell, 1);
  const maxFlight = Math.max(...flight.map(Math.abs), 1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1" style={{ height: 40 }}>
        {dwell.map((d, i) => (
          <div key={i} title={`dwell: ${d.toFixed(0)}ms`} className="flex-1 rounded-t"
            style={{ height: `${Math.max((d / maxDwell) * 100, 6)}%`, background: accent, opacity: 0.8 }} />
        ))}
      </div>
      <div className="flex items-center gap-1" style={{ height: 16 }}>
        {flight.map((f, i) => (
          <div key={i} title={`flight: ${f.toFixed(0)}ms`} className="flex-1 rounded"
            style={{ height: `${Math.min(Math.max((Math.abs(f) / maxFlight) * 100, 15), 100)}%`, background: "var(--text3)", opacity: 0.5 }} />
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text3)" }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: accent, opacity: 0.8 }} /> Dwell (key held)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "var(--text3)", opacity: 0.5 }} /> Flight (gap to next key)</span>
      </div>
    </div>
  );
}

/** Enrolls a keystroke-timing profile from 3 correct retypes of a fixed
 * phrase, then scores a later verification attempt against it via scaled
 * Manhattan distance — see keystrokeAuthRisk.ts's module docstring for the
 * published technique this implements. */
export default function KeystrokeAuthRiskRunner({ accent }: { accent: string }) {
  const { stage, repIndex, enrollReps, value, mismatchFlash, result, onKeyDown, onKeyUp, onChange, restart, tryAgain, start } = useKeystrokeCapture();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: `1px solid ${mismatchFlash ? "#f87171" : "var(--border)"}`,
    color: "var(--text)",
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Type the phrase below exactly as shown. Real key-press timing (dwell = how long each key is
          held, flight = the gap before the next key) is captured to build your own typing-rhythm
          profile, then a later retype is scored against it. This is the real, published
          keystroke-dynamics technique behavioral-biometric systems use — a scaled Manhattan distance
          classifier over dwell/flight timing.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          Nothing is typed content-sensitive here — only timing between real key presses is measured.
          Everything runs in your browser; nothing is sent anywhere.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono px-3 py-2 rounded-lg" style={{ background: "var(--surface)", color: "var(--text)" }}>
              {PHRASE}
            </span>
            {stage === "enroll" && (
              <span className="text-xs" style={{ color: "var(--text3)" }}>
                Enrollment rep {repIndex + 1} of {enrollReps}
              </span>
            )}
            {stage === "ready" && (
              <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>Profile enrolled — type it once more to verify</span>
            )}
          </div>

          {stage !== "scored" && (
            <input
              autoFocus
              value={value}
              onFocus={start}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onChange={onChange}
              placeholder={`Type: "${PHRASE}"`}
              className="text-sm px-4 py-2 rounded-lg outline-none max-w-md"
              style={inputStyle}
              spellCheck={false}
              autoComplete="off"
            />
          )}
          {mismatchFlash && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              That didn&apos;t match the phrase exactly (or Backspace was used) — this attempt was
              discarded. Try again from the start of the box.
            </p>
          )}
        </div>
      </div>

      {stage === "ready" && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs mb-2" style={{ color: "var(--text3)" }}>
            Try a normal retype to see a Low-risk score, or deliberately type much faster, slower, or
            hunt-and-peck style to see the score rise.
          </p>
        </div>
      )}

      {stage === "scored" && result && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold" style={{ color: BAND_STYLE[result.band].color }}>
              {BAND_STYLE[result.band].label}
            </span>
            <span className="text-xs" style={{ color: "var(--text3)" }}>
              scaled Manhattan distance: {result.score.toFixed(2)} (avg per feature)
            </span>
          </div>
          <DwellFlightBars dwell={result.attempt.dwell} flight={result.attempt.flight} accent={accent} />
          <div className="flex items-center gap-3">
            <button onClick={tryAgain}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff" }}>
              Try another attempt
            </button>
            <button onClick={restart} className="text-xs underline" style={{ color: "var(--text3)" }}>
              Re-enroll from scratch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
