import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const GENERATE_TIMEOUT_MS = 60_000;
export const MAX_PROMPT_LEN = 2000;

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
 * press Generate again deliberately. */
export function useTextToImageRunner() {
  const [prompt, setPrompt] = useState("");
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
        body: JSON.stringify({ prompt: trimmed }),
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

  return { prompt, setPrompt, generating, resultImage, resultMimeType, error, generate };
}
