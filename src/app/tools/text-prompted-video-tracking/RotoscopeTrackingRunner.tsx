"use client";

import { useRef, useState } from "react";
import { useRotoscopeTracking } from "./useRotoscopeTracking";
import RotoscopePlayer from "./RotoscopePlayer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function RotoscopeTrackingRunner({ accent }: { accent: string }) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState("");
  const { track, running, result, error, reset } = useRotoscopeTracking();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    reset();
  };

  const run = () => {
    if (videoFile && textPrompt.trim()) track(videoFile, textPrompt);
  };

  const clear = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setTextPrompt("");
    reset();
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Upload a short video and describe the object to track">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ background: accent, color: "#fff" }}>
                Choose video
              </button>
              <input ref={inputRef} type="file" accept="video/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }} />
              {videoFile && <span className="text-xs truncate max-w-[160px]" style={{ color: "var(--text2)" }}>{videoFile.name}</span>}
            </div>
            {videoPreview && (
              <video src={videoPreview} controls muted className="rounded-lg w-full" style={{ background: "#000", maxHeight: 180 }} />
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
            <label className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
              What to track
            </label>
            <input type="text" value={textPrompt} onChange={e => setTextPrompt(e.target.value)}
              placeholder="e.g. the red backpack"
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              Clips are trimmed to 6s and processed at 4fps, downscaled — CPU inference on a free hosted
              Space is slow. Expect roughly 15-40s depending on clip length.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={run} disabled={running || !videoFile || !textPrompt.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Grounding + tracking…" : "Track & mask"}
          </button>
          {(videoFile || result) && (
            <button onClick={clear} disabled={running} className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </Section>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {result && (
        <Section title={`Tracked preview (${result.frame_count} sampled frames @ ${result.fps_used}fps)`}>
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 mb-3">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs" style={{ color: "#f59e0b" }}>⚠ {w}</li>
              ))}
            </ul>
          )}
          <RotoscopePlayer frames={result.frames} fps={result.fps_used} accent={accent} />
        </Section>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> this is not Meta&apos;s SAM3 — SAM3&apos;s
        checkpoints are currently gated behind a Meta access request, so this uses SAM2 + Grounding DINO
        (&quot;Grounded-SAM&quot;) instead, both freely available. The output is a sampled-frame preview
        (reduced fps/resolution), not a full-resolution exported video file, and Grounding DINO only looks
        at the first frame. It also has no reliable way to say &quot;nothing here matches&quot; — a wrong
        description can still return a plausible-looking (but wrong) tracked region instead of an error, so
        always check the result visually.
      </div>
    </div>
  );
}
