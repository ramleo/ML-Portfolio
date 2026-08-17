import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const REQUEST_TIMEOUT_MS = 30_000;
export const MIN_FRAMES = 2;
export const MAX_FRAMES = 30;

export type GrowthFrame = {
  label: string;
  areaFraction: number;
  growthPct: number;
  lowConfidence: boolean;
  maskPreviewUrl: string | null;
};

/** Pure local HSV-threshold leaf-area measurement (no ML model, no API key,
 * no budget cost). Multiple photos in, a growth curve (percentage change in
 * leaf pixel-area vs. the first photo) back — relative, not a real-world
 * area measurement. */
export function usePlantGrowthRunner() {
  const [measuring, setMeasuring] = useState(false);
  const [frames, setFrames] = useState<GrowthFrame[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (payload: { image: string; label: string }[]) => {
    if (payload.length < MIN_FRAMES || payload.length > MAX_FRAMES) {
      setError(`Provide between ${MIN_FRAMES} and ${MAX_FRAMES} photos.`);
      return;
    }
    setMeasuring(true);
    setError(null);
    setFrames(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-plant-growth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: payload }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (!Array.isArray(data.frames)) throw new Error("no frames returned");
      setFrames(data.frames.map((f: {
        label: string; area_fraction: number; growth_pct: number;
        low_confidence: boolean; mask_preview: string | null;
      }) => ({
        label: f.label,
        areaFraction: f.area_fraction,
        growthPct: f.growth_pct,
        lowConfidence: f.low_confidence,
        maskPreviewUrl: f.mask_preview ? `data:image/png;base64,${f.mask_preview}` : null,
      })));
    } catch {
      setError("Growth measurement failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setMeasuring(false);
    }
  }, []);

  const reset = useCallback(() => {
    setFrames(null);
    setError(null);
  }, []);

  return { measuring, frames, error, run, reset };
}
