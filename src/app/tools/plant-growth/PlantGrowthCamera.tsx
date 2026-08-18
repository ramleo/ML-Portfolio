"use client";

import { useEffect, useRef, useState } from "react";

/** Live camera capture, additive to the existing file-picker upload path —
 * captured photos are added to the same pending list as file uploads, so
 * everything downstream (measure, framing-check) works unchanged.
 *
 * When a first photo already exists, it's overlaid semi-transparently on
 * the live video feed as a real-time alignment guide (the actual
 * Caladium-style ghost-overlay pattern researched for this tool) — this
 * only becomes possible with a live camera feed; the file-picker path has
 * no equivalent since it never sees a live preview, only files already
 * taken (see PlantGrowthFramingCheck.tsx's post-hoc blend check, built
 * before this for exactly that reason). */
export function CameraCapture({ overlaySrc, onCapture, onClose }: {
  overlaySrc: string | null;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(35);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support camera capture — use \"Choose photos\" instead.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: DOMException) => {
        setError(
          err.name === "NotAllowedError"
            ? "Camera permission was denied — allow camera access in your browser settings and try again."
            : "Could not access a camera on this device."
        );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.9)" }}>
      <div className="flex flex-col gap-3 items-center" style={{ width: "min(90vw, 480px)" }}>
        {error ? (
          <>
            <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-full"
              style={{ color: "var(--text3)", border: "1px solid var(--border)" }}>
              Close
            </button>
          </>
        ) : (
          <>
            <div className="relative rounded-xl overflow-hidden w-full" style={{ aspectRatio: "3/4", background: "#000" }}>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
              {overlaySrc && (
                <img src={overlaySrc} alt="Alignment guide from your first photo" className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: "cover", opacity: overlayOpacity / 100 }} />
              )}
            </div>
            {overlaySrc && (
              <div className="flex items-center gap-3 w-full">
                <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>Guide opacity</span>
                <input type="range" min={0} max={80} value={overlayOpacity}
                  onChange={e => setOverlayOpacity(Number(e.target.value))} className="flex-1" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={capture} className="text-sm px-5 py-2.5 rounded-full font-semibold" style={{ background: "#fff", color: "#0b0b12" }}>
                Capture
              </button>
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-full" style={{ color: "var(--text3)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
            </div>
            {overlaySrc && (
              <p className="text-xs text-center" style={{ color: "var(--text3)", maxWidth: 380 }}>
                The faint overlay is your first photo — line up the pot and plant edges with it before
                capturing to keep this photo framed the same way.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
