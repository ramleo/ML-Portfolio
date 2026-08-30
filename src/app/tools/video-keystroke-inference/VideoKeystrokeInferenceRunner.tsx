"use client";

import { useRef } from "react";
import { useVideoKeystrokeExtraction } from "./useVideoKeystrokeExtraction";
import type { KeystrokeEvent, WordSegment } from "./keystrokeSignal";

const HAND_COLOR = { left: "#60a5fa", right: "#fbbf24" } as const;

function Timeline({ events, wordSegments, duration, accent }: {
  events: KeystrokeEvent[]; wordSegments: WordSegment[]; duration: number; accent: string;
}) {
  const width = 100; // percent-based, scales with container
  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full rounded-lg" style={{ height: 56, background: "var(--border)" }}>
        {wordSegments.slice(0, -1).map((seg, i) => {
          const boundaryT = events[seg.endIndex].t;
          return (
            <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(boundaryT / duration) * width}%`, background: accent, opacity: 0.5 }} />
          );
        })}
        {events.map((ev, i) => (
          <div key={i} title={`t=${ev.t.toFixed(2)}s, ${ev.hand} hand`}
            className="absolute rounded-full"
            style={{
              left: `${(ev.t / duration) * width}%`, top: "50%", width: 8, height: 8,
              transform: "translate(-50%, -50%)", background: HAND_COLOR[ev.hand],
              border: "1px solid rgba(0,0,0,0.3)",
            }} />
        ))}
      </div>
      <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text3)" }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: HAND_COLOR.left }} /> Left hand</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: HAND_COLOR.right }} /> Right hand</span>
        <span className="flex items-center gap-1"><span className="w-px h-2.5 inline-block" style={{ background: accent }} /> Likely word boundary</span>
      </div>
    </div>
  );
}

/** Uploads a video of typing hands, steps through it frame-by-frame with
 * MediaPipe hand tracking, and runs a real tap-detection pass to recover a
 * keystroke-event timeline purely from motion timing. See
 * useVideoKeystrokeExtraction's docstring for why this is timing-only,
 * not character recovery. */
export default function VideoKeystrokeInferenceRunner({ accent }: { accent: string }) {
  const { videoRef, fileName, videoUrl, setFile, reset, analyze, running, progress, result, error } = useVideoKeystrokeExtraction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload a short video (60s max) of hands typing — your own recorded webcam clip or video-call
          footage. This tracks fingertip motion frame-by-frame and detects real keystroke-shaped
          press-release events purely from timing, the same hand-tracking signal published attacks
          (USENIX Security &apos;23, video-based keystroke inference) key off.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          This does NOT recover which characters were typed — only WHEN keys were pressed. Real
          character-level attacks add a trained language-model decoding stage that needs per-target
          training data this demo doesn&apos;t have. Runs entirely in your browser; no video is uploaded
          anywhere.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff" }}>
            Choose video
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = ""; }} />
          {fileName && (
            <>
              <span className="text-xs" style={{ color: "var(--text2)" }}>{fileName}</span>
              <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear</button>
            </>
          )}
        </div>

        {videoUrl && (
          <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <video ref={videoRef} src={videoUrl} controls muted className="rounded-lg max-w-xs" style={{ background: "#000" }} />
            <button onClick={analyze} disabled={running}
              className="self-start text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff", opacity: running ? 0.6 : 1 }}>
              {running ? `Analyzing… ${progress}%` : "Analyze"}
            </button>
            {running && (
              <div className="w-full max-w-xs rounded-full overflow-hidden" style={{ height: 4, background: "var(--border)" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: accent, transition: "width 0.15s linear" }} />
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {result && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          {result.events.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              No hand motion matching a press-release pattern was detected — try a clip with hands
              clearly visible over a keyboard.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                  {result.events.length} keystroke events detected
                </span>
                <span className="text-xs" style={{ color: "var(--text3)" }}>~{result.wpm} WPM (timing-based estimate)</span>
                <span className="text-xs" style={{ color: "var(--text3)" }}>
                  {result.wordSegments.length} likely word segment{result.wordSegments.length === 1 ? "" : "s"}
                </span>
                {result.rhythm != null && (
                  <span className="text-xs" style={{ color: "var(--text3)" }}>
                    Rhythm consistency: {Math.round(result.rhythm * 100)}%
                  </span>
                )}
              </div>
              <Timeline events={result.events} wordSegments={result.wordSegments} duration={result.durationSeconds} accent={accent} />
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                Each dot is a detected press-release event, colored by which hand; vertical lines mark
                where a longer pause plausibly indicates a space between words. No characters are
                shown because none were inferred — this is the real, measured timing side-channel only.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
