import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { ReconstructedPoint, CameraPose } from "./PointCloudViewer";

const RECONSTRUCT_TIMEOUT_MS = 60_000;

export type Photo = { preview: string; b64: string };
export type CalibrationPoint = { x: number; y: number };

export type ReconstructionResult = {
  points: ReconstructedPoint[];
  camera_poses: CameraPose[];
  warnings: string[];
  scale_applied: boolean;
};

export function useCrimeSceneReconstruction() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [calibA, setCalibA] = useState<CalibrationPoint | null>(null);
  const [calibB, setCalibB] = useState<CalibrationPoint | null>(null);
  const [calibDistanceCm, setCalibDistanceCm] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = useCallback((newPhotos: Photo[]) => {
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 6));
  }, []);

  const removePhoto = useCallback((i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const reconstruct = useCallback(async () => {
    if (photos.length < 2) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RECONSTRUCT_TIMEOUT_MS);
    try {
      const distanceCm = parseFloat(calibDistanceCm);
      const hasCalibration = calibA && calibB && !isNaN(distanceCm) && distanceCm > 0;
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-crime-scene/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: photos.map(p => p.b64),
          ...(hasCalibration ? {
            calibration_point_a: calibA,
            calibration_point_b: calibB,
            calibration_real_distance_cm: distanceCm,
          } : {}),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Reconstruction failed.");
      setResult(data as ReconstructionResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out — try fewer photos or lower resolution." : (err as Error).message || "Reconstruction failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [photos, calibA, calibB, calibDistanceCm]);

  const reset = useCallback(() => {
    setPhotos([]);
    setCalibA(null);
    setCalibB(null);
    setCalibDistanceCm("");
    setResult(null);
    setError(null);
  }, []);

  return {
    photos, addPhotos, removePhoto,
    calibA, setCalibA, calibB, setCalibB, calibDistanceCm, setCalibDistanceCm,
    reconstruct, running, result, error, reset,
  };
}
