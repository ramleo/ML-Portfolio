import { useEffect, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const GENERATE_TIMEOUT_MS = 60_000;
const ENHANCE_TIMEOUT_MS = 20_000;
export const MAX_PROMPT_LEN = 2000;
export const MAX_NEGATIVE_PROMPT_LEN = 500;
const HISTORY_KEY = "ml_text2img_history";
const HISTORY_LIMIT = 6; // images are base64 in localStorage — keep this small to stay well under the ~5MB quota

export interface HistoryEntry {
  prompt: string;
  image: string;
  mimeType: string;
  timestamp: number;
}

export interface GeneratedImage {
  image: string;
  mimeType: string;
  // Style label ("Anime", "Photorealistic") for a chat-triggered styles
  // comparison, or "Version N" for a plain multi-variation run — used by
  // the comparison grid so each image is identifiable, not just a bare
  // thumbnail. Undefined for an ordinary single-image generation.
  label?: string;
}

export const VARIATION_COUNTS = [1, 2, 4] as const;
export type VariationCount = (typeof VARIATION_COUNTS)[number];

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // best-effort — e.g. quota exceeded on a large image; history just won't persist this entry
  }
}

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
  // Mirrors variations[].label — see GeneratedImage's comment. Swapped
  // together with resultImage/resultMimeType by selectVariation.
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [variationCount, setVariationCount] = useState<VariationCount>(1);
  // Extra results beyond the one promoted to resultImage/resultMimeType —
  // only populated when variationCount > 1. Picking one via selectVariation
  // swaps it into the primary slot; NOT added to history individually (only
  // the primary result is, same as a single generation) to avoid bloating
  // the small localStorage-backed history budget with near-duplicates.
  const [variations, setVariations] = useState<GeneratedImage[]>([]);
  // Starts empty (matches SSR output) and is populated from localStorage
  // after mount — reading localStorage during the initial render itself
  // caused a real hydration mismatch (server has no localStorage to read).
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);

  // Best-effort — expands the prompt in place via the free LLM cascade
  // (routers/rag/llm.py's fallback order), not the billed image model, so
  // there's no daily-budget interaction here at all.
  const enhancePrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || enhancing) return;
    setEnhancing(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENHANCE_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-text-to-image/enhance-prompt`, {
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
      if (data.ok && typeof data.enhanced_prompt === "string") {
        setPrompt(data.enhanced_prompt);
      } else {
        setError("Prompt enhancement is temporarily unavailable — try again in a moment.");
      }
    } catch {
      setError("Prompt enhancement is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setEnhancing(false);
    }
  };

  const restoreFromHistory = (entry: HistoryEntry) => setPrompt(entry.prompt);

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // Fires N independent generation requests in parallel, each its own real
  // billed Gemini call against the SAME text2img daily budget pool — so a
  // click at variationCount=4 costs up to 4x a single click. The
  // variation-count control in the UI must show that cost up front before
  // the click, not just here. Partial success (some hit the daily cap
  // mid-batch) is surfaced as a soft note via `error` rather than
  // discarding the ones that DID succeed.
  //
  // `promptOverride`/`variationOverride`/`styleOverrides` exist for the
  // chat-triggered paths (see requestGenerate/requestStyleComparison in
  // TextToImageRunner.tsx, wired to the page's embedded AI chat) — a
  // natural-language request must go through this exact same validated/
  // budgeted call, not a duplicate implementation.
  //   - variationOverride ignores whatever variationCount the UI currently
  //     has selected, so a vague chat request can never silently spend up
  //     to 4x budget just because the user last left the Variations picker
  //     on "4" — a plain chat generate always forces variationOverride=1.
  //   - styleOverrides (e.g. ["anime", "photorealistic"]) runs ONE call per
  //     listed style instead of N identical calls in the UI's current
  //     style — the "compare styles" chat request. Takes precedence over
  //     variationOverride/variationCount (its own length IS the run count).
  // Returns ok/error/count so the caller (chat) can report the real outcome.
  const generate = async (
    promptOverride?: string,
    variationOverride?: number,
    styleOverrides?: (string | null)[],
  ): Promise<{ ok: boolean; error?: string; count?: number }> => {
    const trimmed = (promptOverride ?? prompt).trim();
    if (!trimmed) {
      const msg = "Enter a prompt first.";
      setError(msg);
      return { ok: false, error: msg };
    }
    if (trimmed.length > MAX_PROMPT_LEN) {
      const msg = `Prompt is too long (max ${MAX_PROMPT_LEN} characters).`;
      setError(msg);
      return { ok: false, error: msg };
    }
    if (promptOverride !== undefined) setPrompt(promptOverride);
    const runCount = styleOverrides?.length ?? variationOverride ?? variationCount;
    const stylesToRun = styleOverrides ?? Array.from({ length: runCount }, () => style);
    setGenerating(true);
    setError(null);
    setVariations([]);

    // A label is only meaningful when there's more than one result to tell
    // apart — a named style (from styleOverrides) uses that style's display
    // label; a plain multi-variation run (same style N times) falls back to
    // "Version N" so the comparison grid can still caption each cell.
    const labelFor = (styleForThisCall: string | null, index: number): string | undefined => {
      if (runCount <= 1) return undefined;
      if (styleOverrides) return STYLE_OPTIONS.find(s => s.key === styleForThisCall)?.label ?? `Version ${index + 1}`;
      return `Version ${index + 1}`;
    };

    const runOne = async (styleForThisCall: string | null, index: number): Promise<{ ok: true; value: GeneratedImage } | { ok: false; status: number; detail: string }> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
      try {
        const res = await fetch(`${ML_UNIFIED_API}/rag/mm-text-to-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            style: styleForThisCall,
            aspect_ratio: aspectRatio,
            negative_prompt: negativePrompt.trim() || null,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, status: res.status, detail: data.detail ?? "" };
        return {
          ok: true,
          value: {
            image: data.image as string,
            mimeType: (data.mime_type as string | undefined) ?? "image/png",
            label: labelFor(styleForThisCall, index),
          },
        };
      } catch {
        return { ok: false, status: 0, detail: "" };
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      const outcomes = await Promise.all(stylesToRun.map((s, i) => runOne(s, i)));
      const successes = outcomes.filter((o): o is { ok: true; value: GeneratedImage } => o.ok);
      if (successes.length === 0) {
        const firstFailure = outcomes[0];
        const msg = firstFailure.ok ? "Generation failed." : cleanErr(firstFailure.status, firstFailure.detail);
        setError(msg);
        return { ok: false, error: msg };
      }
      const [primary, ...rest] = successes.map(s => s.value);
      setResultImage(primary.image);
      setResultMimeType(primary.mimeType);
      setResultLabel(primary.label ?? null);
      setVariations(rest);
      let partialMsg: string | undefined;
      if (successes.length < runCount) {
        partialMsg = `${successes.length} of ${runCount} versions generated — the rest hit today's budget limit.`;
        setError(partialMsg);
      }
      setHistory(prev => {
        const next = [{ prompt: trimmed, image: primary.image, mimeType: primary.mimeType, timestamp: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
        saveHistory(next);
        return next;
      });
      return { ok: true, error: partialMsg, count: successes.length };
    } finally {
      setGenerating(false);
    }
  };

  // Promotes one of the extra variations into the primary result slot,
  // swapping it with whatever is currently primary (so nothing is lost —
  // the previous primary becomes a variation in its place).
  const selectVariation = (index: number) => {
    const chosen = variations[index];
    if (!chosen || !resultImage) return;
    const nextVariations = [...variations];
    nextVariations[index] = { image: resultImage, mimeType: resultMimeType, label: resultLabel ?? undefined };
    setVariations(nextVariations);
    setResultImage(chosen.image);
    setResultMimeType(chosen.mimeType);
    setResultLabel(chosen.label ?? null);
  };

  // Called after a successful "Edit this" (mm-ai-fill mode=edit) — a
  // deliberate content change, so unlike sharpen it REPLACES the displayed
  // result and is recorded as its own history entry (it's visually a new
  // image, even though it didn't cost a text-to-image generation call).
  const applyEditedResult = (image: string, mimeType: string) => {
    setResultImage(image);
    setResultMimeType(mimeType);
    setResultLabel(null); // no longer represents whatever style/version it started as
    const editedPrompt = `${prompt.trim()} (edited)`;
    setHistory(prev => {
      const next = [{ prompt: editedPrompt, image, mimeType, timestamp: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  };

  return {
    prompt, setPrompt,
    style, setStyle,
    aspectRatio, setAspectRatio,
    negativePrompt, setNegativePrompt,
    generating, resultImage, resultMimeType, resultLabel, error, generate,
    enhancing, enhancePrompt,
    history, restoreFromHistory, clearHistory,
    applyEditedResult,
    variationCount, setVariationCount, variations, selectVariation,
  };
}
