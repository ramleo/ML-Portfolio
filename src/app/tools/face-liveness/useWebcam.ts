import { useCallback, useEffect, useRef, useState } from "react";

/** Thin wrapper over getUserMedia — no existing precedent for live camera
 * access anywhere else in this codebase (every other tool works off an
 * uploaded/generated image), so this is a from-scratch minimal hook rather
 * than reusing something. Stream is stopped on unmount/stop() so the
 * browser's camera-in-use indicator doesn't stay lit after leaving the page. */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("Couldn't access the camera — check browser permissions, or upload a photo instead.");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  /** Snapshots the current video frame to a JPEG data URL — no downstream
   * consumer needs the raw MediaStream, just one still frame. */
  const capture = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  return { videoRef, active, error, start, stop, capture };
}
