import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const SEARCH_TIMEOUT_MS = 30_000;

export type PhotoItem = { filename: string; preview: string; b64: string };
export type SearchResult = { filename: string; score: number };

/** Batch photo → CLIP embedding → cosine-similarity ranking against a text
 * query, entirely stateless server-side (no indexing, no persistence — the
 * whole batch + query is sent and ranked in one request). See
 * mm_photo_search.py's module docstring for why no vector DB is needed
 * here. */
export function usePhotoSearch() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = useCallback((items: PhotoItem[]) => {
    setPhotos(prev => [...prev, ...items]);
    setResults(null);
  }, []);

  const removePhoto = useCallback((filename: string) => {
    setPhotos(prev => prev.filter(p => p.filename !== filename));
    setResults(null);
  }, []);

  const reset = useCallback(() => {
    setPhotos([]);
    setQuery("");
    setResults(null);
    setError(null);
  }, []);

  const search = useCallback(async () => {
    if (!query.trim() || photos.length === 0) return;
    setSearching(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-photo-search/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map(p => ({ filename: p.filename, image: p.b64 })),
          query: query.trim(),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Search failed — try again in a moment.");
      setResults(data.results as SearchResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setSearching(false);
    }
  }, [photos, query]);

  return { photos, addPhotos, removePhoto, query, setQuery, search, searching, results, error, reset };
}
