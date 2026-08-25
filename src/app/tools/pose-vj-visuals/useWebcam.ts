import { useCallback, useEffect, useRef, useState } from "react";

/** Mirrors face-liveness/useWebcam.ts's shape, minus its capture() single-
 * frame snapshot — this tool needs the live &lt;video&gt; element itself for
 * continuous per-frame pose detection, not a still image. Kept as its own
 * copy (not a cross-tool import) since no tool in this codebase shares
 * hooks across directories. */
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
      setError("Couldn't access the camera — check browser permissions.");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, active, error, start, stop };
}
