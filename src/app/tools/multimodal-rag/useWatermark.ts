import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

export type WatermarkVerifyResult = { present: boolean; label: string | null; confidence: number };

/** Fetch/state logic for invisible watermark embed + verify — pure local
 * image processing on the backend (routers/rag/mm_watermark.py, DCT/QIM),
 * no external API and no budget cost, so unlike useInpaint's AI-fill path
 * there's no progress-bar/timeout-tuning-for-a-real-model concern here. */
export function useWatermark() {
  const [embedding, setEmbedding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<WatermarkVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const embed = async (image: string, label: string): Promise<string | null> => {
    setEmbedding(true);
    setError(null);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-watermark/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, label }),
      }, { tool: "multimodal-rag" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Embed failed");
      return data.image as string;
    } catch {
      setError("Could not embed a watermark right now.");
      return null;
    } finally {
      setEmbedding(false);
    }
  };

  const verify = async (image: string) => {
    setVerifying(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-watermark/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      }, { tool: "multimodal-rag" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verify failed");
      setVerifyResult(data as WatermarkVerifyResult);
    } catch {
      setError("Could not check for a watermark right now.");
    } finally {
      setVerifying(false);
    }
  };

  return { embedding, verifying, verifyResult, error, embed, verify, clearVerify: () => setVerifyResult(null) };
}
