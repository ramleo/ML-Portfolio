import { useCallback, useEffect, useRef, useState } from "react";

export type HandPoint = { x: number; y: number }; // normalized 0-1, video-relative
export type HandLandmarks = HandPoint[]; // 21 points per MediaPipe's hand model

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

/** Client-side hand-landmark tracking via MediaPipe Tasks Vision — the
 * model runs entirely in the browser (WASM+WebGL), no video frame is ever
 * sent to a server. The WASM runtime and the ~8MB model file are both
 * fetched lazily from Google's CDN on first use, not bundled with the app. */
export function usePoseTracking(videoRef: React.RefObject<HTMLVideoElement | null>, active: boolean) {
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const landmarkerRef = useRef<import("@mediapipe/tasks-vision").HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 2,
        });
        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;
        setReady(true);
      } catch {
        if (!cancelled) setLoadError("Couldn't load the hand-tracking model — check your connection and try again.");
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setReady(false);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !ready) return;

    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && landmarker && video.videoWidth > 0) {
        const result = landmarker.detectForVideo(video, performance.now());
        setHands((result.landmarks ?? []).map(pts => pts.map(p => ({ x: p.x, y: p.y }))));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, ready, videoRef]);

  const clear = useCallback(() => setHands([]), []);

  return { hands, ready, loadError, clear };
}
