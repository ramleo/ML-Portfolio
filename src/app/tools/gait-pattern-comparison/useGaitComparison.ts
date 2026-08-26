import { useCallback, useRef, useState } from "react";
import { usePoseVideoExtraction } from "../movement-form-comparison/usePoseVideoExtraction";
import { computeGaitSignature, compareGaitSignatures, type GaitSignature, type GaitComparisonResult } from "./gaitAnalysis";

type Slot = { fileName: string | null; videoUrl: string | null };

export function useGaitComparison() {
  const [videoA, setSlotA] = useState<Slot>({ fileName: null, videoUrl: null });
  const [videoB, setSlotB] = useState<Slot>({ fileName: null, videoUrl: null });
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signatureA, setSignatureA] = useState<GaitSignature | null>(null);
  const [signatureB, setSignatureB] = useState<GaitSignature | null>(null);
  const [comparison, setComparison] = useState<GaitComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { extract } = usePoseVideoExtraction();

  const setFileA = useCallback((file: File) => {
    setSlotA(prev => { if (prev.videoUrl) URL.revokeObjectURL(prev.videoUrl); return { fileName: file.name, videoUrl: URL.createObjectURL(file) }; });
    setSignatureA(null); setComparison(null); setError(null);
  }, []);
  const setFileB = useCallback((file: File) => {
    setSlotB(prev => { if (prev.videoUrl) URL.revokeObjectURL(prev.videoUrl); return { fileName: file.name, videoUrl: URL.createObjectURL(file) }; });
    setSignatureB(null); setComparison(null); setError(null);
  }, []);

  const reset = useCallback(() => {
    if (videoA.videoUrl) URL.revokeObjectURL(videoA.videoUrl);
    if (videoB.videoUrl) URL.revokeObjectURL(videoB.videoUrl);
    setSlotA({ fileName: null, videoUrl: null });
    setSlotB({ fileName: null, videoUrl: null });
    setSignatureA(null); setSignatureB(null); setComparison(null);
    setError(null); setProgress(0);
  }, [videoA.videoUrl, videoB.videoUrl]);

  const analyze = useCallback(async () => {
    const elA = videoARef.current;
    const elB = videoBRef.current;
    if (!elA || !elB || !videoA.videoUrl || !videoB.videoUrl) return;

    setRunning(true);
    setError(null);
    setProgress(0);
    setSignatureA(null); setSignatureB(null); setComparison(null);
    try {
      const framesA = await extract(elA, pct => setProgress(Math.round(pct / 2)));
      const framesB = await extract(elB, pct => setProgress(50 + Math.round(pct / 2)));

      if (framesA.length === 0 || framesB.length === 0) {
        throw new Error("Could not detect a person in one of the videos — make sure the full body is visible.");
      }

      const sigA = computeGaitSignature(framesA);
      const sigB = computeGaitSignature(framesB);
      setSignatureA(sigA);
      setSignatureB(sigB);
      if (sigA.available && sigB.available) {
        setComparison(compareGaitSignatures(sigA, sigB));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed — try different clips.");
    } finally {
      setRunning(false);
    }
  }, [extract, videoA.videoUrl, videoB.videoUrl]);

  return {
    videoARef, videoBRef,
    videoA, videoB, setFileA, setFileB, reset,
    analyze, running, progress, signatureA, signatureB, comparison, error,
  };
}
