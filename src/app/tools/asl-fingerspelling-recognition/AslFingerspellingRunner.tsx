"use client";

import { useAslWebcam } from "./useAslWebcam";
import { useAslFingerspelling } from "./useAslFingerspelling";
import { SUPPORTED_LETTERS, MEASURED_HOLDOUT_ACCURACY } from "./handShapeClassifier";

export default function AslFingerspellingRunner({ accent }: { accent: string }) {
  const { videoRef, active, error, start, stop } = useAslWebcam();
  const { letter, handVisible, ready, loadError } = useAslFingerspelling(videoRef, active);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Hold up one hand, fingerspelling a letter of the ASL alphabet, facing the camera. Recognition
          runs entirely in your browser (MediaPipe HandLandmarker + a k-NN classifier trained on real
          photos) — no video ever leaves your device.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          Fingerspelling only — not sign-language translation. Supports {SUPPORTED_LETTERS.length}{" "}
          static letters (A-Z excluding J and Z, which require motion a single frame can&apos;t capture).
          Measured held-out accuracy: {Math.round(MEASURED_HOLDOUT_ACCURACY * 100)}%{" "}
          — real, useful, but not perfect; see the User Guide for known letter mix-ups.
        </p>

        <div className="flex items-center gap-3 mb-4">
          {!active ? (
            <button onClick={start} className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors" style={{ background: accent, color: "#fff" }}>
              Start camera
            </button>
          ) : (
            <button onClick={stop} className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border" style={{ borderColor: `${accent}50`, color: accent }}>
              Stop camera
            </button>
          )}
          {!ready && active && !loadError && (
            <span className="text-xs" style={{ color: "var(--text3)" }}>Loading hand-tracking model…</span>
          )}
        </div>

        {error && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{error}</p>}
        {loadError && <p className="text-xs mb-3" style={{ color: "#f87171" }}>{loadError}</p>}

        <div className="relative rounded-xl overflow-hidden" style={{ background: "#000", aspectRatio: "4 / 3", maxWidth: 480, display: active ? "block" : "none" }}>
          <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} muted playsInline />
          {ready && (
            <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-center" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
              {letter ? (
                <span className="text-5xl font-black" style={{ color: accent }}>{letter}</span>
              ) : (
                <span className="text-xs" style={{ color: "#fff" }}>
                  {handVisible ? "Hold the shape steady…" : "Show one hand to the camera"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle} className="p-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Supported letters</h3>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LETTERS.map(l => (
            <span key={l} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
              {l}
            </span>
          ))}
        </div>
        <p className="text-[10px] mt-3" style={{ color: "var(--text3)" }}>
          J and Z are excluded — both require a traced motion in real ASL, indistinguishable from other
          letters (or each other) in a single static frame.
        </p>
      </div>

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> not a sign-language
        translator — it recognizes individual finger-spelled letters, never whole signed words or ASL
        grammar. The {Math.round(MEASURED_HOLDOUT_ACCURACY * 100)}% accuracy is measured on real held-out
        photos with plain backgrounds, not verified end-to-end on a real live webcam feed in this
        environment — visually similar hand shapes (e.g. U/V/R, M/S/N/A) are a real, disclosed source of
        mix-ups, not a bug.
      </div>
    </div>
  );
}
