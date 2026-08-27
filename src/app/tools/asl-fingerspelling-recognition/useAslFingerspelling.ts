import { useEffect, useRef, useState } from "react";
import { classifyHandShape, type HandLandmark3 } from "./handShapeClassifier";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const STABLE_FRAMES_REQUIRED = 6; // ~0.1-0.2s at typical webcam framerates before a letter is shown

/** Live hand-shape classification off the webcam feed: MediaPipe
 * HandLandmarker (same model/setup as pose-vj-visuals' usePoseTracking.ts,
 * numHands reduced to 1 since fingerspelling is one-handed) feeds each
 * frame's landmarks into handShapeClassifier.ts. A letter is only shown
 * once the same prediction holds for STABLE_FRAMES_REQUIRED consecutive
 * frames — a disclosed stability filter that reduces flicker from
 * single-frame noise, not evidence the underlying accuracy is higher
 * than the measured 79% (see handShapeClassifier.ts). */
export function useAslFingerspelling(videoRef: React.RefObject<HTMLVideoElement | null>, active: boolean) {
  const [letter, setLetter] = useState<string | null>(null);
  const [handVisible, setHandVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const landmarkerRef = useRef<import("@mediapipe/tasks-vision").HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streakRef = useRef<{ letter: string; count: number }>({ letter: "", count: 0 });

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
          numHands: 1,
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
        const hand = result.landmarks?.[0] as HandLandmark3[] | undefined;
        setHandVisible(!!hand);
        if (hand) {
          const { letter: predicted } = classifyHandShape(hand);
          const streak = streakRef.current;
          if (streak.letter === predicted) {
            streak.count++;
          } else {
            streakRef.current = { letter: predicted, count: 1 };
          }
          if (streakRef.current.count >= STABLE_FRAMES_REQUIRED) {
            setLetter(predicted);
          }
        } else {
          streakRef.current = { letter: "", count: 0 };
          setLetter(null);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, ready, videoRef]);

  return { letter, handVisible, ready, loadError };
}
