import { useCallback, useRef, useState } from "react";
import {
  detectTapEvents, mergeNearbyEvents, segmentWordBoundaries, estimateWpm, rhythmConsistency,
  type FingerSeries, type KeystrokeEvent, type WordSegment,
} from "./keystrokeSignal";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const SAMPLE_INTERVAL_S = 1 / 20; // 20 samples/sec — dense enough to resolve a ~100-150ms press-release cycle
const FINGERTIPS = [4, 8, 12, 16, 20]; // thumb/index/middle/ring/pinky tips, same set as pose-vj-visuals

export type KeystrokeResult = {
  events: KeystrokeEvent[];
  wordSegments: WordSegment[];
  wpm: number;
  rhythm: number | null;
  durationSeconds: number;
};

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise(resolve => {
    const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}

/** Steps a video frame-by-frame at a fixed sample rate (not real-time
 * playback) so keystroke timing is measured against accurate, monotonic
 * timestamps rather than rAF/decode jitter — see useVideoKeystrokeExtraction's
 * module context in the plan: this precision is the whole point, since the
 * only signal here is timing, not the frames themselves. Reuses the same
 * MediaPipe HandLandmarker setup as pose-vj-visuals' usePoseTracking.ts. */
export function useVideoKeystrokeExtraction() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<KeystrokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const setFile = useCallback((file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setProgress(0);
  }, [videoUrl]);

  const reset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFileName(null);
    setVideoUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
  }, [videoUrl]);

  const analyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    setRunning(true);
    setError(null);
    setProgress(0);

    let landmarker: import("@mediapipe/tasks-vision").HandLandmarker | null = null;
    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numHands: 2,
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
      if (duration > 60) {
        throw new Error("Keep clips to 60 seconds or under for this demo.");
      }

      // series[hand][fingertip landmark index] -> samples collected in time order
      const series = new Map<string, FingerSeries>();
      const seriesFor = (hand: "left" | "right", finger: number) => {
        const key = `${hand}-${finger}`;
        let f = series.get(key);
        if (!f) { f = { hand, finger, samples: [] }; series.set(key, f); }
        return f;
      };

      const totalSteps = Math.ceil(duration / SAMPLE_INTERVAL_S);
      for (let step = 0; step <= totalSteps; step++) {
        const t = Math.min(step * SAMPLE_INTERVAL_S, duration - 0.001);
        await seekTo(video, t);
        const detection = landmarker.detectForVideo(video, performance.now());
        const hands = detection.landmarks ?? [];
        const handedness = detection.handedness ?? [];
        hands.forEach((points, i) => {
          // MediaPipe's "handedness" is mirror-flipped for a front-facing
          // camera view (its own convention) — not corrected here since
          // left/right is only used to color-code the timeline, not to
          // infer key identity.
          const label = (handedness[i]?.[0]?.categoryName === "Left" ? "left" : "right") as "left" | "right";
          for (const idx of FINGERTIPS) {
            const p = points[idx];
            if (!p) continue;
            seriesFor(label, idx).samples.push({ t, x: p.x, y: p.y });
          }
        });
        if (step % 4 === 0) setProgress(Math.round((step / totalSteps) * 100));
      }
      setProgress(100);

      const allSeries = Array.from(series.values());
      const rawEvents = detectTapEvents(allSeries);
      const events = mergeNearbyEvents(rawEvents);
      const wordSegments = segmentWordBoundaries(events);

      setResult({
        events,
        wordSegments,
        wpm: estimateWpm(events, duration),
        rhythm: rhythmConsistency(events),
        durationSeconds: duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed — try a different clip.");
    } finally {
      landmarker?.close();
      setRunning(false);
    }
  }, [videoUrl]);

  return { videoRef, fileName, videoUrl, setFile, reset, analyze, running, progress, result, error };
}
