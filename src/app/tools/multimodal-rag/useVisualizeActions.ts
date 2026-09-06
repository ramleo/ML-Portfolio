"use client";

import { useCallback, useMemo, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

export type VisualizeState = { visualizing: boolean; vizImage: string | null; vizError: string | null; visualize: () => void };

/** Manages N independent "generate an on-demand illustrative image" actions
 * (e.g. steganography's LSB bit-plane, moire's FFT spectrum) behind ONE hook
 * call instead of one bespoke hook per detector — each new detector that
 * needs this pattern is now a one-line addition to `endpoints` below, not a
 * new file plus new props threaded through CitationThumbnailPanel.tsx (which
 * is near this project's 400-line file cap). `endpoints` maps a stable key
 * (e.g. "steganography") to the backend's `/rag/<endpoint>/visualize` path
 * segment (e.g. "mm-steganography"). `getImage` supplies the current
 * citation's image bytes lazily (evaluated only when a button is actually
 * clicked), since the image can change between renders (e.g. after an edit).
 */
export function useVisualizeActions<K extends string>(
  endpoints: Record<K, string>,
  getImage: () => string,
): Record<K, VisualizeState> {
  const [state, setState] = useState<Record<string, { visualizing: boolean; vizImage: string | null; vizError: string | null }>>(
    () => Object.fromEntries(Object.keys(endpoints).map(k => [k, { visualizing: false, vizImage: null, vizError: null }])),
  );

  const visualize = useCallback(async (key: K) => {
    setState(s => ({ ...s, [key]: { visualizing: true, vizImage: null, vizError: null } }));
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/${endpoints[key]}/visualize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: getImage() }),
      }, { tool: "multimodal-rag" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setState(s => ({ ...s, [key]: { visualizing: false, vizImage: data.image as string, vizError: null } }));
    } catch {
      setState(s => ({ ...s, [key]: { visualizing: false, vizImage: null, vizError: "Could not generate the visualization — try again." } }));
    }
  }, [endpoints, getImage]);

  return useMemo(() => Object.fromEntries(
    Object.keys(endpoints).map(k => [k, { ...state[k], visualize: () => { void visualize(k as K); } }]),
  ) as Record<K, VisualizeState>, [endpoints, state, visualize]);
}
