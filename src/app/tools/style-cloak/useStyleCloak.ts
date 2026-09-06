import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;

export type ProtectionLevel = "strong" | "moderate" | "weak";
export type StyleCloakResult = {
  cloaked_image?: string;
  cosine_similarity?: number;
  protection_level?: ProtectionLevel;
};

/** Adds an adversarial perturbation to an image, pushing its CLIP image
 * embedding away from where it naturally sits — a simplified, untargeted
 * version of the real Glaze/Nightshade artist-protection technique. See
 * mm_style_cloak.py's module docstring for the real testing behind the
 * cosine-similarity framing and its honest limitations. */
export function useStyleCloak() {
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [epsilon, setEpsilon] = useState(0.06);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StyleCloakResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setImage = useCallback((dataUrl: string) => {
    setPreview(dataUrl);
    setB64(dataUrl.split(",")[1] ?? "");
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setB64(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!b64) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-style-cloak/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, epsilon }),
        signal: controller.signal,
      }, { tool: "style-cloak" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Cloaking failed — try again in a moment.");
      setResult(data as StyleCloakResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cloaking failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [b64, epsilon]);

  return { preview, setImage, reset, epsilon, setEpsilon, run, running, result, error };
}
