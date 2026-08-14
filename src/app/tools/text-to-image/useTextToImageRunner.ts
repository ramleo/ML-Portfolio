import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const GENERATE_TIMEOUT_MS = 60_000;
export const MAX_PROMPT_LEN = 2000;
export const MAX_NEGATIVE_PROMPT_LEN = 500;

// Keys must match _STYLES/_ASPECT_RATIOS in mm_text_to_image.py exactly —
// the backend validates against its own fixed set and rejects anything
// else with a 400, so these are just labels for the same keys, not a
// second source of truth for the actual prompt text.
export const STYLE_OPTIONS: { key: string; label: string }[] = [
  { key: "photorealistic", label: "Photorealistic" },
  { key: "watercolor", label: "Watercolor" },
  { key: "anime", label: "Anime" },
  { key: "cyberpunk", label: "Cyberpunk" },
  { key: "oil-painting", label: "Oil Painting" },
  { key: "3d-render", label: "3D Render" },
  { key: "sketch", label: "Sketch" },
];

export const ASPECT_RATIO_OPTIONS: { key: string; label: string }[] = [
  { key: "square", label: "Square" },
  { key: "landscape", label: "Landscape" },
  { key: "portrait", label: "Portrait" },
];

// Mirrors text-to-sql's _utils.tsx cleanErr() pattern — friendlier text for
// the budget-cap 429 than the raw backend detail string.
function cleanErr(status: number, detail: string): string {
  if (status === 429 || /budget reached|429|rate.?limit/i.test(detail)) {
    return "Daily generation budget reached — resets at UTC midnight. This limit exists to control API cost, not per-user throttling.";
  }
  return detail || "Generation failed — try again in a moment.";
}

/** Fetch/state logic for the Text-to-Image tool (/rag/mm-text-to-image) —
 * a single prompt-in/image-out call, no bbox/region or OCR-corroboration
 * fields since there's no input image to sharpen/edit here. Each call is a
 * real billed Gemini generation (own daily budget pool, see
 * mm_text_to_image.py / _image_gen_budget.py), so this intentionally has
 * no auto-retry — a failed or cancelled generation just leaves the user to
 * press Generate again deliberately.
 *
 * style/aspectRatio/negativePrompt are pure prompt-text additions on the
 * backend (same single Gemini call, longer prompt string) — selecting them
 * doesn't change the cost or request shape, so they're free to toggle. */
export function useTextToImageRunner() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  // Gemini's pure-generation response was observed live to return
  // image/jpeg, NOT png (unlike the editing endpoints, which send png in
  // and get png back) — kept dynamic rather than assumed so the data URI
  // below is always built with the mime type the backend actually saw.
  const [resultMimeType, setResultMimeType] = useState("image/png");
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Enter a prompt first.");
      return;
    }
    if (trimmed.length > MAX_PROMPT_LEN) {
      setError(`Prompt is too long (max ${MAX_PROMPT_LEN} characters).`);
      return;
    }
    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-text-to-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          style,
          aspect_ratio: aspectRatio,
          negative_prompt: negativePrompt.trim() || null,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(cleanErr(res.status, data.detail ?? ""));
        return;
      }
      setResultImage(data.image as string);
      setResultMimeType((data.mime_type as string | undefined) ?? "image/png");
    } catch {
      setError("Text-to-image is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  };

  return {
    prompt, setPrompt,
    style, setStyle,
    aspectRatio, setAspectRatio,
    negativePrompt, setNegativePrompt,
    generating, resultImage, resultMimeType, error, generate,
  };
}
