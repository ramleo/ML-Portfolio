import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const REQUEST_TIMEOUT_MS = 30_000;
export const MIN_FRAMES = 1;
export const GROWTH_MIN_FRAMES = 2; // hint-text only, not a hard block — see PlantGrowthRunner
export const MAX_FRAMES = 30;

export type GrowthFrame = {
  label: string;
  areaFraction: number;
  growthPct: number;
  lowConfidence: boolean;
  maskPreviewUrl: string | null;
  greennessIndex: number;
  leafCount: number;
};

export type PlantTrack = {
  index: number;
  frames: GrowthFrame[];
};

export type PlantComparison = {
  index: number;
  areaFraction: number;
  relativePct: number;
  lowConfidence: boolean;
  maskPreviewUrl: string | null;
  greennessIndex: number;
  leafCount: number;
};

export type PlantResult =
  | { mode: "growth"; plants: PlantTrack[]; autoSplitCollage: boolean }
  | { mode: "compare"; plants: PlantComparison[] };

type RawFrame = {
  label: string; area_fraction: number; growth_pct: number;
  low_confidence: boolean; mask_preview: string | null;
  greenness_index: number; leaf_count: number;
};

type RawComparison = {
  index: number; area_fraction: number; relative_pct: number;
  low_confidence: boolean; mask_preview: string | null;
  greenness_index: number; leaf_count: number;
};

function toGrowthFrame(f: RawFrame): GrowthFrame {
  return {
    label: f.label,
    areaFraction: f.area_fraction,
    growthPct: f.growth_pct,
    lowConfidence: f.low_confidence,
    maskPreviewUrl: f.mask_preview ? `data:image/png;base64,${f.mask_preview}` : null,
    greennessIndex: f.greenness_index,
    leafCount: f.leaf_count,
  };
}

function toComparison(p: RawComparison): PlantComparison {
  return {
    index: p.index,
    areaFraction: p.area_fraction,
    relativePct: p.relative_pct,
    lowConfidence: p.low_confidence,
    maskPreviewUrl: p.mask_preview ? `data:image/png;base64,${p.mask_preview}` : null,
    greennessIndex: p.greenness_index,
    leafCount: p.leaf_count,
  };
}

/** Pure local HSV-threshold leaf-area measurement (no ML model, no API key,
 * no budget cost). Two modes, discriminated by the backend's own `mode`
 * field: "growth" (2+ photos — one growth-over-time curve per detected
 * plant, relative to that plant's first photo) or "compare" (exactly 1
 * photo — plants found in it compared to EACH OTHER right now, largest =
 * 100%, no time axis). There's no baseline to grow from with one photo, so
 * these are genuinely different aggregations, not the same shape twice.
 *
 * A single photo can also come back as "growth" with `autoSplitCollage:
 * true` — the backend detected a before/after collage seam and split it
 * into two panels automatically instead of comparing them as coexisting
 * plants; the UI should say so rather than silently showing a growth curve
 * for a photo the user thought they uploaded as one image. */
export function usePlantGrowthRunner() {
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (payload: { image: string; label: string }[], autoDetect: boolean) => {
    if (payload.length < MIN_FRAMES || payload.length > MAX_FRAMES) {
      setError(`Provide between ${MIN_FRAMES} and ${MAX_FRAMES} photos.`);
      return;
    }
    setMeasuring(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-plant-growth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: payload, auto_detect: autoDetect }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "request failed");
      if (data.mode === "compare") {
        setResult({ mode: "compare", plants: (data.plants as RawComparison[]).map(toComparison) });
      } else if (data.mode === "growth" && Array.isArray(data.plants)) {
        setResult({
          mode: "growth",
          plants: data.plants.map((p: { index: number; frames: RawFrame[] }) => ({
            index: p.index,
            frames: p.frames.map(toGrowthFrame),
          })),
          autoSplitCollage: Boolean(data.auto_split_collage),
        });
      } else {
        throw new Error("unrecognized response");
      }
    } catch (e) {
      setError(e instanceof Error && e.message !== "request failed" && e.message !== "unrecognized response"
        ? e.message
        : "Growth measurement failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setMeasuring(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { measuring, result, error, run, reset };
}
