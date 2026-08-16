"use client";

import { useRef } from "react";
import { useWebcam } from "./useWebcam";
import { useLivenessCheck } from "./useLivenessCheck";

const ACCENT = "#14b8a6";
const REAL_COLOR = "#34d399";
const SPOOF_COLOR = "#f87171";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Webcam capture OR file upload → face crop (server-side, reusing the
 * existing OIV7 face detector) → real/spoof classification. No history, no
 * budget gating, no chat integration — deliberately the simplest of the
 * standalone tools, since the interesting part is the model+caveat, not UI
 * surface area. */
export default function FaceLivenessRunner({ accent = ACCENT }: { accent?: string }) {
  const webcam = useWebcam();
  const { checking, result, error, check, reset } = useLivenessCheck();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const captureAndCheck = () => {
    const dataUrl = webcam.capture();
    if (!dataUrl) return;
    const b64 = dataUrl.split(",")[1];
    if (b64) check(b64);
  };

  const onFileSelected = async (file: File) => {
    reset();
    const dataUrl = await readFileAsDataUrl(file);
    const b64 = dataUrl.split(",")[1];
    if (b64) check(b64);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Show your face to your camera (or upload a photo) — this checks whether it looks like a genuinely
          live face or a spoofed presentation of one (a printed photo, a phone/screen replay). The same
          category of check that gates face-unlock and identity-verification systems.
        </p>

        <div className="relative rounded-xl overflow-hidden mb-4" style={{ background: "#0a0f1a", aspectRatio: "4/3", maxWidth: 480 }}>
          <video ref={webcam.videoRef} className="w-full h-full object-cover" muted playsInline
            style={{ display: webcam.active ? "block" : "none", transform: "scaleX(-1)" }} />
          {!webcam.active && (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs" style={{ color: "var(--text3)" }}>Camera off</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!webcam.active ? (
            <button onClick={webcam.start}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: `${accent}40`, color: accent }}>
              Start camera
            </button>
          ) : (
            <>
              <button onClick={captureAndCheck} disabled={checking}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: accent, color: "#0b0b12", opacity: checking ? 0.5 : 1 }}>
                {checking ? "Checking…" : "Capture & check"}
              </button>
              <button onClick={webcam.stop}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text3)" }}>
                Stop camera
              </button>
            </>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={checking}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text3)", opacity: checking ? 0.5 : 1 }}>
            Upload a photo instead
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = ""; }} />
        </div>

        {webcam.error && <p className="text-[11px] mt-2" style={{ color: SPOOF_COLOR }}>{webcam.error}</p>}
      </div>

      {(result || error) && (
        <div style={cardStyle} className="p-5">
          {error && <p className="text-xs" style={{ color: SPOOF_COLOR }}>{error}</p>}
          {result && !result.foundFace && (
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              No face confidently detected — try a clearer, front-facing shot with good lighting.
            </p>
          )}
          {result && result.foundFace && result.isReal !== null && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: result.isReal ? REAL_COLOR : SPOOF_COLOR }}>
                  {result.isReal ? "Looks live" : "Looks spoofed"}
                </span>
                {result.confidence !== null && (
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                This model scores 98.2% on its own training benchmark, but published research on this task is
                consistent that liveness detectors generalize poorly to camera/lighting/spoof setups they
                weren&apos;t trained on — expect it to work well in good conditions and be genuinely unreliable
                at the edges. Treat a result here as a signal to investigate, not a certainty.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
