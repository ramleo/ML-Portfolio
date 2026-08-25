import { useCallback, useState } from "react";
import type { PoseFrame } from "./jointAngles";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const SAMPLE_INTERVAL_S = 1 / 10; // body motion is slower than the keystroke tool's typing signal — 10/s is plenty
const MAX_DURATION_S = 30;

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(resolve => {
    const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}

/** Steps one video frame-by-frame at a fixed sample rate and returns its
 * 3D world-landmark pose per sampled frame — the same deterministic
 * currentTime/seeked pattern as useVideoKeystrokeExtraction.ts, adapted
 * for MediaPipe's PoseLandmarker (numPoses: 1, single exerciser assumed
 * and disclosed in the UI) instead of HandLandmarker. */
export function usePoseVideoExtraction() {
  const [progress, setProgress] = useState(0);

  const extract = useCallback(async (video: HTMLVideoElement, onProgress: (pct: number) => void): Promise<PoseFrame[]> => {
    let landmarker: import("@mediapipe/tasks-vision").PoseLandmarker | null = null;
    try {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 1) return resolve();
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Could not load this video file."));
      });
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        throw new Error("Could not read this video's duration.");
      }
      if (duration > MAX_DURATION_S) {
        throw new Error(`Keep clips to ${MAX_DURATION_S} seconds or under for this demo.`);
      }

      const frames: PoseFrame[] = [];
      const totalSteps = Math.ceil(duration / SAMPLE_INTERVAL_S);
      for (let step = 0; step <= totalSteps; step++) {
        const t = Math.min(step * SAMPLE_INTERVAL_S, duration - 0.001);
        await seekTo(video, t);
        const detection = landmarker.detectForVideo(video, performance.now());
        const world = detection.worldLandmarks?.[0];
        if (world) frames.push({ t, landmarks: world });
        if (step % 3 === 0) onProgress(Math.round((step / totalSteps) * 100));
      }
      onProgress(100);
      return frames;
    } finally {
      landmarker?.close();
    }
  }, []);

  return { extract, progress, setProgress };
}
