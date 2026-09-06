import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;

export type ReidVerdict = "same" | "uncertain" | "different";
export type GalleryResult = {
  index: number;
  found_face: boolean;
  cosine_similarity: number | null;
  verdict: ReidVerdict | null;
  face_confidence?: number;
};
export type ReidSearchResult = {
  target_found_face: boolean;
  target_face_confidence?: number;
  gallery: GalleryResult[];
  best_match_index: number | null;
  best_match_similarity: number | null;
  best_match_verdict: ReidVerdict | null;
};

type GalleryPhoto = { preview: string; b64: string };

/** Runs a face-embedding similarity search of a target photo against a
 * small user-supplied gallery — the "shows the attack" demo, see
 * mm_face_reid_demo.py's module docstring. A second "protect and re-test"
 * pass reuses Face Cloak's existing /mm-face-cloak/run endpoint unmodified,
 * then re-runs this same search to show the match score drop. */
export function useFaceReidDemo() {
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [targetB64, setTargetB64] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReidSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [protecting, setProtecting] = useState(false);
  const [protectedPreview, setProtectedPreview] = useState<string | null>(null);
  const [protectedResult, setProtectedResult] = useState<ReidSearchResult | null>(null);
  const [protectError, setProtectError] = useState<string | null>(null);

  const setTarget = useCallback((dataUrl: string) => {
    setTargetPreview(dataUrl);
    setTargetB64(dataUrl.split(",")[1] ?? "");
    setResult(null);
    setError(null);
    setProtectedPreview(null);
    setProtectedResult(null);
    setProtectError(null);
  }, []);

  const addGalleryPhotos = useCallback((photos: { preview: string; b64: string }[]) => {
    setGallery(prev => [...prev, ...photos].slice(0, 10));
    setResult(null);
    setProtectedResult(null);
  }, []);

  const removeGalleryPhoto = useCallback((index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
    setResult(null);
    setProtectedResult(null);
  }, []);

  const reset = useCallback(() => {
    setTargetPreview(null);
    setTargetB64(null);
    setGallery([]);
    setResult(null);
    setError(null);
    setProtectedPreview(null);
    setProtectedResult(null);
    setProtectError(null);
  }, []);

  const search = useCallback(
    async (target: string, galleryB64: string[]): Promise<ReidSearchResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
      try {
        const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-face-reid-demo/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, gallery: galleryB64 }),
          signal: controller.signal,
        }, { tool: "face-deanonymization-demo" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || "Search failed — try again in a moment.");
        return data as ReidSearchResult;
      } finally {
        clearTimeout(timeout);
      }
    },
    []
  );

  const run = useCallback(async () => {
    if (!targetB64 || gallery.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      setResult(await search(targetB64, gallery.map(g => g.b64)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — try again in a moment.");
    } finally {
      setRunning(false);
    }
  }, [targetB64, gallery, search]);

  const protectAndRetest = useCallback(async () => {
    if (!targetB64 || gallery.length === 0) return;
    setProtecting(true);
    setProtectError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const cloakRes = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-face-cloak/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: targetB64, epsilon: 0.05 }),
        signal: controller.signal,
      }, { tool: "face-deanonymization-demo" });
      const cloakData = await cloakRes.json().catch(() => null);
      if (!cloakRes.ok || !cloakData?.found_face) {
        throw new Error(cloakData?.error || cloakData?.detail || "Could not cloak this photo — try again.");
      }
      setProtectedPreview(`data:image/png;base64,${cloakData.cloaked_image}`);
      setProtectedResult(await search(cloakData.cloaked_image, gallery.map(g => g.b64)));
    } catch (err) {
      setProtectError(err instanceof Error ? err.message : "Protection step failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setProtecting(false);
    }
  }, [targetB64, gallery, search]);

  return {
    targetPreview, setTarget, gallery, addGalleryPhotos, removeGalleryPhoto, reset,
    run, running, result, error,
    protectAndRetest, protecting, protectedPreview, protectedResult, protectError,
  };
}
