import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { toPngBase64 } from "./imageUtils";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

const EDIT_TIMEOUT_MS = 60_000;
export const MAX_EDIT_PROMPT_LEN = 500;

/** Fetch/state logic for the two post-generation edit actions on the
 * generated image, both routed through the same shared image-edit daily
 * budget pool ("shared" in _image_gen_budget.py) that citation sharpen/
 * AI-fill already draw from — reusing those two existing, already-verified
 * endpoints rather than adding a new billed model call.
 *
 * "Sharpen" (POST /rag/mm-deblur, bbox: null) mirrors useSharpen.ts's
 * design exactly: the result is kept in SEPARATE `sharpenedImage` state
 * with a view toggle, never silently overwriting the base generated image
 * — it's generative, not true deconvolution, so it must stay an explicitly
 * -toggled, labeled view (see mm_deblur.py's module docstring).
 *
 * "Edit this" (POST /rag/mm-ai-fill, mode: "edit") is a deliberate content
 * change, not a clarity toggle, so a successful edit REPLACES the base
 * image via `onEdited` — the caller is expected to push it into history too.
 *
 * Both re-encode the source to guaranteed PNG bytes first (mm-deblur/
 * mm-ai-fill assume PNG; Gemini's pure-generation call can return JPEG).
 * State resets whenever `baseImage` changes (a new generation or a restored
 * history entry), same syncKey pattern as useSharpen.ts. */
export function useTextToImageEdit(
  baseImage: string | null,
  baseMimeType: string,
  onEdited: (image: string, mimeType: string) => void,
) {
  const [sharpening, setSharpening] = useState(false);
  const [sharpenedImage, setSharpenedImage] = useState<string | null>(null);
  const [viewSharpened, setViewSharpened] = useState(true);
  const [sharpenError, setSharpenError] = useState<string | null>(null);

  const [editPrompt, setEditPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [syncedImage, setSyncedImage] = useState(baseImage);
  if (baseImage !== syncedImage) {
    setSyncedImage(baseImage);
    setSharpenedImage(null);
    setSharpenError(null);
    setViewSharpened(true);
    setEditPrompt("");
    setEditError(null);
  }

  const sharpenImage = async () => {
    if (!baseImage || sharpening) return;
    setSharpening(true);
    setSharpenError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EDIT_TIMEOUT_MS);
    try {
      const png = await toPngBase64(baseImage, baseMimeType);
      const sharpenRunId = newRunId();
      trackRunStart("text-to-image-sharpen", sharpenRunId);
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-deblur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: png, bbox: null }),
        signal: controller.signal,
      }, { tool: "text-to-image-sharpen", runId: sharpenRunId });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSharpenError(data.detail ?? "Sharpen is temporarily unavailable — try again in a moment.");
        return;
      }
      setSharpenedImage(data.image as string);
      setViewSharpened(true);
    } catch {
      setSharpenError("Sharpen is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setSharpening(false);
    }
  };

  const applyEdit = async () => {
    const trimmed = editPrompt.trim();
    if (!baseImage || !trimmed || editing) return;
    setEditing(true);
    setEditError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EDIT_TIMEOUT_MS);
    try {
      const png = await toPngBase64(baseImage, baseMimeType);
      const editRunId = newRunId();
      trackRunStart("text-to-image-edit", editRunId, { chars: trimmed.length });
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: png, bbox: null, prompt: trimmed, mode: "edit" }),
        signal: controller.signal,
      }, { tool: "text-to-image-edit", runId: editRunId, meta: { chars: trimmed.length } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.detail ?? "Edit is temporarily unavailable — try again in a moment.");
        return;
      }
      onEdited(data.image as string, "image/png");
      setEditPrompt("");
    } catch {
      setEditError("Edit is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setEditing(false);
    }
  };

  return {
    sharpening, sharpenedImage, viewSharpened, setViewSharpened, sharpenError, sharpenImage,
    editPrompt, setEditPrompt, editing, editError, applyEdit,
  };
}