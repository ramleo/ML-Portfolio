"use client";

import { useRef } from "react";
import { useGaitComparison } from "./useGaitComparison";
import { GAIT_JOINT_LABELS, type GaitJointKey, type GaitSignature } from "./gaitAnalysis";

const CHART_W = 280, CHART_H = 120, PAD = 8;

function pointsToPath(values: number[], minY: number, maxY: number): string {
  const range = Math.max(1, maxY - minY);
  return values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (CHART_W - 2 * PAD);
    const y = CHART_H - PAD - ((v - minY) / range) * (CHART_H - 2 * PAD);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${Number.isNaN(y) ? CHART_H / 2 : y.toFixed(1)}`;
  }).join(" ");
}

const OVERALL_LABEL: Record<string, { text: string; color: string }> = {
  similar: { text: "Similar gait pattern", color: "#22c55e" },
  some_differences: { text: "Some differences", color: "#f59e0b" },
  substantially_different: { text: "Substantially different", color: "#ef4444" },
};

function JointChart({ joint, curveA, curveB, rms, accent }: {
  joint: GaitJointKey; curveA: number[]; curveB: number[]; rms: number; accent: string;
}) {
  const all = [...curveA, ...curveB].filter(v => !Number.isNaN(v));
  const minY = all.length ? Math.min(...all) - 5 : 0;
  const maxY = all.length ? Math.max(...all) + 5 : 180;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{GAIT_JOINT_LABELS[joint]}</span>
        <span className="text-[10px]" style={{ color: "var(--text3)" }}>RMS {Number.isNaN(rms) ? "—" : `${rms.toFixed(1)}°`}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: "block" }}>
        <path d={pointsToPath(curveB, minY, maxY)} fill="none" stroke="var(--text3)" strokeWidth={2} strokeDasharray="4 3" />
        <path d={pointsToPath(curveA, minY, maxY)} fill="none" stroke={accent} strokeWidth={2} />
      </svg>
    </div>
  );
}

function UploadSlot({ label, fileName, videoUrl, videoRef, onFile, accent, signature }: {
  label: string; fileName: string | null; videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>; onFile: (f: File) => void; accent: string;
  signature: GaitSignature | null;
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
      {signature && (
        signature.available
          ? <p className="text-xs" style={{ color: "var(--text2)" }}>
              {signature.numCycles} strides detected · cadence ≈ {signature.cadenceStepsPerMinute} steps/min
            </p>
          : <p className="text-xs" style={{ color: "#f59e0b" }}>{signature.warnings[0]}</p>
      )}
    </div>
  );
}

/** Uploads two walking videos, tracks body pose via MediaPipe PoseLandmarker
 * (reusing movement-form-comparison's exact extraction pipeline), detects
 * repeating gait cycles from knee-angle peaks, and compares the two videos'
 * averaged gait-cycle joint-angle curves. See gaitAnalysis.ts's docstrings
 * for the cycle-detection/averaging approach and disclosed limitations. */
export default function GaitComparisonRunner({ accent }: { accent: string }) {
  const {
    videoARef, videoBRef, videoA, videoB, setFileA, setFileB, reset,
    analyze, running, progress, signatureA, signatureB, comparison, error,
  } = useGaitComparison();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };
  const canAnalyze = !!videoA.videoUrl && !!videoB.videoUrl;

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload two side-view videos of someone walking (≤30s each, several full strides). This tracks
          body pose frame-by-frame with MediaPipe, detects repeating gait cycles from knee-angle peaks,
          and compares the two videos&apos; averaged stride-cycle joint-angle curves.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          This is NOT a validated biometric identification technique — camera angle, clothing, walking
          speed, and fatigue all affect the result. Treat it as &quot;do these two clips show a similar
          walking pattern,&quot; never as proof of identity. Runs entirely in your browser; no video is
          uploaded anywhere.
        </p>

        <div className="flex gap-4 flex-wrap">
          <UploadSlot label="Video A" fileName={videoA.fileName} videoUrl={videoA.videoUrl} videoRef={videoARef} onFile={setFileA} accent={accent} signature={signatureA} />
          <UploadSlot label="Video B" fileName={videoB.fileName} videoUrl={videoB.videoUrl} videoRef={videoBRef} onFile={setFileB} accent={accent} signature={signatureB} />
        </div>

        {(videoA.videoUrl || videoB.videoUrl) && (
          <div className="flex items-center gap-3 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={analyze} disabled={!canAnalyze || running}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff", opacity: (!canAnalyze || running) ? 0.5 : 1 }}>
              {running ? `Analyzing… ${progress}%` : "Compare gait patterns"}
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

      {comparison && signatureA?.available && signatureB?.available && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text3)" }}>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: accent }} /> Video A</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: "var(--text3)", borderTop: "2px dashed var(--text3)" }} /> Video B</span>
            </div>
            <span className="text-sm font-bold" style={{ color: OVERALL_LABEL[comparison.overallLabel].color }}>
              {OVERALL_LABEL[comparison.overallLabel].text} (avg RMS {comparison.overallRms.toFixed(1)}°)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {comparison.perJoint.map(({ joint, rms }) => (
              <JointChart key={joint} joint={joint} curveA={signatureA.perJointAvgCurve[joint]} curveB={signatureB.perJointAvgCurve[joint]} rms={rms} accent={accent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
