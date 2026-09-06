import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;

export type ReidVerdict = "same" | "uncertain" | "different";
export type GalleryResult = {
  index: number;
  found_animal: boolean;
  animal_label?: string;
  cosine_similarity: number | null;
  verdict: ReidVerdict | null;
  detection_confidence?: number;
};
export type WildlifeReidResult = {
  target_found_animal: boolean;
  target_animal_label?: string;
  target_detection_confidence?: number;
  gallery: GalleryResult[];
  best_match_index: number | null;
  best_match_similarity: number | null;
  best_match_verdict: ReidVerdict | null;
};

type GalleryPhoto = { preview: string; b64: string };

export function useWildlifeReid() {
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [targetB64, setTargetB64] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WildlifeReidResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setTarget = useCallback((dataUrl: string) => {
    setTargetPreview(dataUrl);
    setTargetB64(dataUrl.split(",")[1] ?? "");
    setResult(null);
    setError(null);
  }, []);

  const addGalleryPhotos = useCallback((photos: GalleryPhoto[]) => {
    setGallery(prev => [...prev, ...photos].slice(0, 10));
    setResult(null);
  }, []);

  const removeGalleryPhoto = useCallback((index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
    setResult(null);
  }, []);

  const reset = useCallback(() => {
    setTargetPreview(null);
    setTargetB64(null);
    setGallery([]);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!targetB64 || gallery.length === 0) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-wildlife-reid/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetB64, gallery: gallery.map(g => g.b64) }),
        signal: controller.signal,
      }, { tool: "wildlife-reidentification" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Search failed — try again in a moment.");
      setResult(data as WildlifeReidResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [targetB64, gallery]);

  return { targetPreview, setTarget, gallery, addGalleryPhotos, removeGalleryPhoto, reset, run, running, result, error };
}
