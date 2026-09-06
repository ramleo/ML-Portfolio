"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

const ERROR_COLOR = "#f87171";
const REQUEST_TIMEOUT_MS = 30_000;

type SpeciesResult = { species: string | null; health: string | null };

/** Paid Gemini vision call (mm_plant_growth_species.py) — the only non-free
 * feature in this tool, everything else is local HSV/CV. Identifies from
 * ONE photo (the first pending photo, whichever plant is most prominent in
 * it) rather than per-plant-crop: crops aren't exposed to the frontend
 * today, and this is a single uncorroborated AI opinion regardless, so
 * scoping it to one representative photo instead of building crop-plumbing
 * for a guess is the honest tradeoff. User-triggered only (a button, never
 * automatic) since it costs real money per call. */
export function SpeciesId({ imageDataUrl, accent }: { imageDataUrl: string | null; accent: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeciesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identify = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const runId = newRunId();
    trackRunStart("plant-growth-species-id", runId);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-plant-growth-species`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl.split(",")[1] ?? "" }),
        signal: controller.signal,
      }, { tool: "plant-growth-species-id", runId });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "request failed");
      setResult({ species: data.species ?? null, health: data.health ?? null });
    } catch (e) {
      setError(e instanceof Error && e.message !== "request failed" ? e.message : "Species ID failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  if (!imageDataUrl) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <button onClick={identify} disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border self-start"
        style={{ borderColor: "var(--border)", color: "var(--text3)", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Identifying…" : "Identify species & health (AI, first photo)"}
      </button>
      {error && <p className="text-[11px]" style={{ color: ERROR_COLOR }}>{error}</p>}
      {result && (
        <div className="text-[11px] px-3 py-2 rounded-lg" style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
          <p><strong style={{ color: accent }}>Species:</strong> {result.species ?? "Could not determine"}</p>
          <p><strong style={{ color: accent }}>Health:</strong> {result.health ?? "Could not determine"}</p>
          <p className="mt-1" style={{ color: "var(--text3)" }}>
            One AI opinion from this photo alone, not a verified diagnosis — cross-check anything important.
          </p>
        </div>
      )}
    </div>
  );
}
