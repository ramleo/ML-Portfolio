import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

/** Fetch/state for the "show what the computer sees" steganography
 * illustration (/rag/mm-steganography/visualize) — deliberately its own
 * tiny hook rather than folded into CitationThumbnailPanel.tsx directly,
 * which is already near the project's 400-line file cap. Purely
 * illustrative, computed on demand (only when the user actually opens the
 * "Possible hidden data" dropdown option), never persisted. */
export function useStegoVisualize() {
  const [visualizing, setVisualizing] = useState(false);
  const [vizImage, setVizImage] = useState<string | null>(null);
  const [vizError, setVizError] = useState<string | null>(null);

  const visualize = async (image: string) => {
    setVisualizing(true);
    setVizError(null);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-steganography/visualize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVizImage(data.image as string);
    } catch {
      setVizError("Could not generate the visualization — try again.");
    } finally {
      setVisualizing(false);
    }
  };

  const reset = () => { setVizImage(null); setVizError(null); };

  return { visualizing, vizImage, vizError, visualize, reset };
}
