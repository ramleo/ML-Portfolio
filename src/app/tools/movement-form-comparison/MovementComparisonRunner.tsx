"use client";

import { useRef } from "react";
import { useMovementComparison } from "./useMovementComparison";
import { JOINT_LABELS, type JointDeviation } from "./jointAngles";

const CHART_W = 280, CHART_H = 120, PAD = 8;

function pointsToPath(values: number[], minY: number, maxY: number): string {
  const range = Math.max(1, maxY - minY);
  return values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (CHART_W - 2 * PAD);
    const y = CHART_H - PAD - ((v - minY) / range) * (CHART_H - 2 * PAD);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${Number.isNaN(y) ? CHART_H / 2 : y.toFixed(1)}`;
  }).join(" ");
}

function JointChart({ dev, accent }: { dev: JointDeviation; accent: string }) {
  const all = [...dev.userPhase, ...dev.refPhase].filter(v => !Number.isNaN(v));
  const minY = all.length ? Math.min(...all) - 5 : 0;
  const maxY = all.length ? Math.max(...all) + 5 : 180;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{JOINT_LABELS[dev.joint]}</span>
        <span className="text-[10px]" style={{ color: "var(--text3)" }}>RMS {Number.isNaN(dev.rms) ? "—" : `${dev.rms.toFixed(1)}°`}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: "block" }}>
        <path d={pointsToPath(dev.refPhase, minY, maxY)} fill="none" stroke="var(--text3)" strokeWidth={2} strokeDasharray="4 3" />
        <path d={pointsToPath(dev.userPhase, minY, maxY)} fill="none" stroke={accent} strokeWidth={2} />
      </svg>
      <p className="text-[10px]" style={{ color: "var(--text3)" }}>
        {!Number.isNaN(dev.worstDiff) && Math.abs(dev.worstDiff) > 0.5
          ? `Biggest gap at ${dev.worstPhaseIndex * 2}% through the movement: your angle was ${Math.abs(dev.worstDiff).toFixed(0)}° ${dev.worstDiff < 0 ? "less" : "more"} bent than the reference.`
          : "Closely matched the reference throughout."}
      </p>
    </div>
  );
}

function UploadSlot({ label, fileName, videoUrl, videoRef, onFile, accent }: {
  label: string; fileName: string | null; videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>; onFile: (f: File) => void; accent: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>{label}</span>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => inputRef.current?.click()}
          className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={{ background: accent, color: "#fff" }}>
          Choose video
        </button>
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }} />
        {fileName && <span className="text-xs truncate max-w-[140px]" style={{ color: "var(--text2)" }}>{fileName}</span>}
      </div>
      {videoUrl && (
        <video ref={videoRef} src={videoUrl} controls muted className="rounded-lg w-full" style={{ background: "#000", maxHeight: 180 }} />
      )}
    </div>
  );
}

/** Uploads your movement + a reference movement, tracks body pose in both
 * via MediaPipe PoseLandmarker, and compares real joint angles on a
 * shared 0-100% movement-phase axis. See useMovementComparison's and
 * jointAngles.ts's docstrings for the phase-alignment approach and the
 * disclosed single-person/one-rep assumptions. */
export default function MovementComparisonRunner({ accent }: { accent: string }) {
  const {
    userVideoRef, referenceVideoRef, user, reference, setUserFile, setReferenceFile, reset,
    analyze, running, progress, result, error,
  } = useMovementComparison();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };
  const canAnalyze = !!user.videoUrl && !!reference.videoUrl;

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload your movement and a reference movement of the same exercise (each trimmed to one full
          rep, ≤30s). This tracks body pose frame-by-frame with MediaPipe and compares 6 real joint
          angles — elbows, knees, hips — on both sides, aligned to a shared 0-100% movement-phase axis
          so clips of different length are directly comparable.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          Assumes one person per video and one full rep start-to-finish — no rep counting or
          auto-segmentation is attempted. A training-form aid, not a clinical or professional-coaching
          assessment. Runs entirely in your browser; no video is uploaded anywhere.
        </p>

        <div className="flex gap-4 flex-wrap">
          <UploadSlot label="Your movement" fileName={user.fileName} videoUrl={user.videoUrl} videoRef={userVideoRef} onFile={setUserFile} accent={accent} />
          <UploadSlot label="Reference movement" fileName={reference.fileName} videoUrl={reference.videoUrl} videoRef={referenceVideoRef} onFile={setReferenceFile} accent={accent} />
        </div>

        {(user.videoUrl || reference.videoUrl) && (
          <div className="flex items-center gap-3 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={analyze} disabled={!canAnalyze || running}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff", opacity: (!canAnalyze || running) ? 0.5 : 1 }}>
              {running ? `Analyzing… ${progress}%` : "Compare movements"}
            </button>
            <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear all</button>
          </div>
        )}
        {running && (
          <div className="w-full max-w-xs rounded-full overflow-hidden mt-2" style={{ height: 4, background: "var(--border)" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: accent, transition: "width 0.15s linear" }} />
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {result && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text3)" }}>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: accent }} /> You</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: "var(--text3)", borderTop: "2px dashed var(--text3)" }} /> Reference</span>
            <span>Joints ranked by largest deviation first</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.map(dev => <JointChart key={dev.joint} dev={dev} accent={accent} />)}
          </div>
        </div>
      )}
    </div>
  );
}
