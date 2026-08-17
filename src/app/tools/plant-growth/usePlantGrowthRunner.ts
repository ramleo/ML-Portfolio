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

export type PlantTrack = {
  index: number;
  frames: GrowthFrame[];
};

type RawFrame = {
  label: string; area_fraction: number; growth_pct: number;
  low_confidence: boolean; mask_preview: string | null;
};

function toGrowthFrame(f: RawFrame): GrowthFrame {
  return {
    label: f.label,
    areaFraction: f.area_fraction,
    growthPct: f.growth_pct,
    lowConfidence: f.low_confidence,
    maskPreviewUrl: f.mask_preview ? `data:image/png;base64,${f.mask_preview}` : null,
  };
}

/** Pure local HSV-threshold leaf-area measurement (no ML model, no API key,
 * no budget cost). Multiple photos in, one growth curve per detected plant
 * back (percentage change in leaf pixel-area vs. that plant's first photo)
 * — relative, not a real-world area measurement. When auto-detect finds no
 * separate plants (or is turned off), the backend still returns a single
 * track — same shape either way, no special-casing needed here. */
export function usePlantGrowthRunner() {
  const [measuring, setMeasuring] = useState(false);
  const [plants, setPlants] = useState<PlantTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (payload: { image: string; label: string }[], autoDetect: boolean) => {
    if (payload.length < MIN_FRAMES || payload.length > MAX_FRAMES) {
      setError(`Provide between ${MIN_FRAMES} and ${MAX_FRAMES} photos.`);
      return;
    }
    setMeasuring(true);
    setError(null);
    setPlants(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-plant-growth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: payload, auto_detect: autoDetect }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (!Array.isArray(data.plants)) throw new Error("no plants returned");
      setPlants(data.plants.map((p: { index: number; frames: RawFrame[] }) => ({
        index: p.index,
        frames: p.frames.map(toGrowthFrame),
      })));
    } catch {
      setError("Growth measurement failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setMeasuring(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPlants(null);
    setError(null);
  }, []);

  return { measuring, plants, error, run, reset };
}
