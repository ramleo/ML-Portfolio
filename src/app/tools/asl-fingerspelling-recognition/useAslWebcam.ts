import { useCallback, useEffect, useRef, useState } from "react";

/** Same shape as pose-vj-visuals/useWebcam.ts — kept as its own copy per
 * this codebase's convention that camera hooks aren't shared across tool
 * directories (unlike pure-math hooks, e.g. gait-pattern-comparison's
 * reuse of movement-form-comparison's jointAngles.ts). */
export function useAslWebcam() {
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
