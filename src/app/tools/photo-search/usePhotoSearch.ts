import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const SEARCH_TIMEOUT_MS = 30_000;

export type PhotoItem = { filename: string; preview: string; b64: string };
export type SearchResult = { filename: string; score: number };

/** Batch photo → CLIP embedding → cosine-similarity ranking against a
 * query, entirely stateless server-side (no indexing, no persistence — the
 * whole batch + query is sent and ranked in one request). The query is
 * either typed text or another photo from the same batch ("find more like
 * this one") — see mm_photo_search.py's module docstring for why no vector
 * DB is needed here. */
export function usePhotoSearch() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [query, setQuery] = useState("");
  const [imageQueryFilename, setImageQueryFilename] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = useCallback((items: PhotoItem[]) => {
    setPhotos(prev => [...prev, ...items]);
    setResults(null);
    setImageQueryFilename(null);
  }, []);

  const removePhoto = useCallback((filename: string) => {
    setPhotos(prev => prev.filter(p => p.filename !== filename));
    setResults(null);
    setImageQueryFilename(prev => (prev === filename ? null : prev));
  }, []);

  const reset = useCallback(() => {
    setPhotos([]);
    setQuery("");
    setImageQueryFilename(null);
    setResults(null);
    setError(null);
  }, []);

  const runSearch = useCallback(async (body: Record<string, unknown>) => {
    setSearching(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-photo-search/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, []);

  const search = useCallback(() => {
    if (!query.trim() || photos.length === 0) return;
    setImageQueryFilename(null);
    runSearch({
      photos: photos.map(p => ({ filename: p.filename, image: p.b64 })),
      query: query.trim(),
    });
  }, [photos, query, runSearch]);

  const searchByImage = useCallback((filename: string) => {
    const ref = photos.find(p => p.filename === filename);
    if (!ref) return;
    setQuery("");
    setImageQueryFilename(filename);
    runSearch({
      photos: photos.map(p => ({ filename: p.filename, image: p.b64 })),
      query_image: ref.b64,
      exclude_filename: filename,
    });
  }, [photos, runSearch]);

  return {
    photos, addPhotos, removePhoto, query, setQuery, search, searchByImage, imageQueryFilename,
    searching, results, error, reset,
  };
}
