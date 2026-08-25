import { useCallback, useRef, useState } from "react";
import { usePoseVideoExtraction } from "./usePoseVideoExtraction";
import { extractAngleSeries, compareMovements, type JointDeviation } from "./jointAngles";

type Slot = { fileName: string | null; videoUrl: string | null };

export function useMovementComparison() {
  const [user, setUserSlot] = useState<Slot>({ fileName: null, videoUrl: null });
  const [reference, setReferenceSlot] = useState<Slot>({ fileName: null, videoUrl: null });
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const referenceVideoRef = useRef<HTMLVideoElement | null>(null);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<JointDeviation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { extract } = usePoseVideoExtraction();

  const setUserFile = useCallback((file: File) => {
    setUserSlot(prev => { if (prev.videoUrl) URL.revokeObjectURL(prev.videoUrl); return { fileName: file.name, videoUrl: URL.createObjectURL(file) }; });
    setResult(null);
    setError(null);
  }, []);
  const setReferenceFile = useCallback((file: File) => {
    setReferenceSlot(prev => { if (prev.videoUrl) URL.revokeObjectURL(prev.videoUrl); return { fileName: file.name, videoUrl: URL.createObjectURL(file) }; });
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    if (user.videoUrl) URL.revokeObjectURL(user.videoUrl);
    if (reference.videoUrl) URL.revokeObjectURL(reference.videoUrl);
    setUserSlot({ fileName: null, videoUrl: null });
    setReferenceSlot({ fileName: null, videoUrl: null });
    setResult(null);
    setError(null);
    setProgress(0);
  }, [user.videoUrl, reference.videoUrl]);

  const analyze = useCallback(async () => {
    const userVideo = userVideoRef.current;
    const refVideo = referenceVideoRef.current;
    if (!userVideo || !refVideo || !user.videoUrl || !reference.videoUrl) return;

    setRunning(true);
    setError(null);
    setProgress(0);
    try {
      const userFrames = await extract(userVideo, pct => setProgress(Math.round(pct / 2)));
      const refFrames = await extract(refVideo, pct => setProgress(50 + Math.round(pct / 2)));

      if (userFrames.length === 0 || refFrames.length === 0) {
        throw new Error("Could not detect a person in one of the videos — make sure the full body is visible.");
      }

      const userSeries = extractAngleSeries(userFrames);
      const refSeries = extractAngleSeries(refFrames);
      setResult(compareMovements(userSeries, refSeries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed — try different clips.");
    } finally {
      setRunning(false);
    }
  }, [extract, user.videoUrl, reference.videoUrl]);

  return {
    userVideoRef, referenceVideoRef,
    user, reference, setUserFile, setReferenceFile, reset,
    analyze, running, progress, result, error,
  };
}
