"use client";

import { useState } from "react";
import { useWebcam } from "./useWebcam";
import { usePoseTracking } from "./usePoseTracking";
import { useMicAudio } from "./useMicAudio";
import VjCanvas from "./VjCanvas";

const CANVAS_W = 960;
const CANVAS_H = 540;

/** Wires webcam capture, client-side hand tracking, optional mic-amplitude
 * input, and the particle canvas together. Everything here runs in the
 * browser — no frame or audio sample is ever sent to a server, unlike
 * every other tool in this app, which is worth stating plainly in the UI
 * rather than leaving as an implementation detail. */
export default function PoseVjRunner({ accent }: { accent: string }) {
  const webcam = useWebcam();
  const { hands, ready, loadError } = usePoseTracking(webcam.videoRef, webcam.active);
  const mic = useMicAudio();
  const [hue, setHue] = useState(280);
  const [density, setDensity] = useState(1);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Your hand movements drive a generative particle visual — turn on your camera, wave your
          hands around. Optionally turn on your microphone too and play some music nearby: particle
          size and density react to whatever the mic hears (plain volume, not beat or genre
          detection). Everything runs in your browser — no video frame or audio sample is ever sent
          anywhere.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => (webcam.active ? webcam.stop() : webcam.start())}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff" }}>
            {webcam.active ? "Stop camera" : "Start camera"}
          </button>
          <button onClick={() => (mic.active ? mic.stop() : mic.start())} disabled={!webcam.active}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: mic.active ? "#34d399" : "var(--border)", color: mic.active ? "#0b0b12" : "var(--text2)", opacity: webcam.active ? 1 : 0.5 }}>
            {mic.active ? "Mic on" : "Turn on mic"}
          </button>
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
            Hue
            <input type="range" min={0} max={360} step={5} value={hue}
              onChange={e => setHue(Number(e.target.value))} className="w-24" />
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
            Density
            <input type="range" min={0.2} max={2} step={0.1} value={density}
              onChange={e => setDensity(Number(e.target.value))} className="w-24" />
          </label>
        </div>

        {webcam.error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{webcam.error}</p>}
        {loadError && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{loadError}</p>}
        {mic.error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{mic.error}</p>}

        {webcam.active && (
          <div className="flex flex-col gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="relative">
              <VjCanvas hands={hands} amplitude={mic.active ? mic.amplitude : 0} hue={hue} density={density} width={CANVAS_W} height={CANVAS_H} />
              {/* Small mirrored self-view so the user can see where their
                  hands actually are relative to frame — the canvas above is
                  the real generative output, this is just for calibration. */}
              <video ref={webcam.videoRef} muted playsInline
                className="absolute bottom-2 right-2 rounded border w-28 opacity-70"
                style={{ borderColor: "var(--border2)", transform: "scaleX(-1)" }} />
            </div>
            {!ready && !loadError && (
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>Loading hand-tracking model…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
