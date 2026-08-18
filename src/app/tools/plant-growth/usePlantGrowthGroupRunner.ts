import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { MAX_FRAMES, type GrowthFrame, type PlantTrack } from "./usePlantGrowthRunner";

const REQUEST_TIMEOUT_MS = 30_000;
export const GROUP_MIN_PHOTOS = 2;

export type ProposedGroup = {
  groupId: number;
  photoIndices: number[];
  orderSource: "exif" | "leaf_area_fallback" | "mixed";
  orderConfidence: "high" | "low";
  clusterConfidence: "high" | "ambiguous";
  ambiguousWith: number[];
  reason?: string;
};

export type UnclusteredPhoto = { photoIndex: number; reason: string };

export type ProposeResult = { groups: ProposedGroup[]; unclustered: UnclusteredPhoto[]; error?: string };

export type MeasuredGroup = { groupId: number; plants: PlantTrack[] };

type RawFrame = {
  label: string; area_fraction: number; growth_pct: number;
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

/** Backend for the "unlabeled, unordered, possibly multi-plant batch" mode:
 * a two-phase propose-then-measure flow (mm_plant_growth_reid.py) rather
 * than one call, because the clustering step is a similarity guess that can
 * be wrong (false merge silently corrupts a growth curve, false split just
 * costs a manual re-merge) — nothing expensive/hard-to-undo runs until the
 * caller has shown the user the proposed grouping and gotten it confirmed
 * (or edited) via confirmAndMeasure. */
export function usePlantGrowthGroupRunner() {
  const [proposing, setProposing] = useState(false);
  const [proposed, setProposed] = useState<ProposeResult | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [result, setResult] = useState<MeasuredGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(async (photos: string[]) => {
    if (photos.length < GROUP_MIN_PHOTOS || photos.length > MAX_FRAMES) {
      setError(`Provide between ${GROUP_MIN_PHOTOS} and ${MAX_FRAMES} photos.`);
      return;
    }
    setProposing(true);
    setError(null);
    setProposed(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-plant-growth-group/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photos.map(image => ({ image })), auto_detect: true }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "request failed");
      setProposed({
        groups: (data.groups ?? []).map((g: {
          group_id: number; photo_indices: number[]; order_source: string;
          order_confidence: string; cluster_confidence: string; ambiguous_with: number[]; reason?: string;
        }) => ({
          groupId: g.group_id,
          photoIndices: g.photo_indices,
          orderSource: g.order_source,
          orderConfidence: g.order_confidence,
          clusterConfidence: g.cluster_confidence,
          ambiguousWith: g.ambiguous_with,
          reason: g.reason,
        })),
        unclustered: (data.unclustered ?? []).map((u: { photo_index: number; reason: string }) => ({
          photoIndex: u.photo_index, reason: u.reason,
        })),
        error: data.error,
      });
    } catch (e) {
      setError(e instanceof Error && e.message !== "request failed" ? e.message : "Grouping failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setProposing(false);
    }
  }, []);

  const confirmAndMeasure = useCallback(async (
    photos: string[], groups: { groupId: number; photoIndices: number[] }[],
  ) => {
    setMeasuring(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-plant-growth-group/measure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map(image => ({ image })),
          groups: groups.map(g => ({ group_id: g.groupId, photo_indices: g.photoIndices })),
          auto_detect: true,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "request failed");
      setResult((data.groups ?? []).map((g: { group_id: number; plants: { index: number; frames: RawFrame[] }[] }) => ({
        groupId: g.group_id,
        plants: g.plants.map(p => ({ index: p.index, frames: p.frames.map(toGrowthFrame) })),
      })));
    } catch (e) {
      setError(e instanceof Error && e.message !== "request failed" ? e.message : "Measurement failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setMeasuring(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProposed(null);
    setResult(null);
    setError(null);
  }, []);

  return { proposing, proposed, measuring, result, error, propose, confirmAndMeasure, reset };
}
