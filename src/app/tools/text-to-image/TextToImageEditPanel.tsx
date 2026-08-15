"use client";

import { Label } from "./TextToImageRunner";
import { useTextToImageEdit, MAX_EDIT_PROMPT_LEN } from "./useTextToImageEdit";

const pillBtnStyle = (accent: string, disabled: boolean) => ({
  fontSize: "0.75rem", fontWeight: 600, padding: "0.4rem 0.9rem", borderRadius: 9999,
  border: `1px solid ${accent}35`, background: `${accent}12`, color: accent,
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
});

/** Two post-generation edit actions, both routed through the existing
 * mm-deblur/mm-ai-fill endpoints (see useTextToImageEdit.ts) rather than a
 * new billed call — "Sharpen" is a disposable, toggled view (never silently
 * replaces the base image); "Edit this" is a deliberate content change that
 * does replace it, and gets pushed into generation history like a fresh
 * result since it's visually a new image. */
export default function TextToImageEditPanel({
  accent, baseImage, baseMimeType, onEdited,
}: {
  accent: string;
  baseImage: string;
  baseMimeType: string;
  onEdited: (image: string, mimeType: string) => void;
}) {
  const {
    sharpening, sharpenedImage, viewSharpened, setViewSharpened, sharpenError, sharpenImage,
    editPrompt, setEditPrompt, editing, editError, applyEdit,
  } = useTextToImageEdit(baseImage, baseMimeType, onEdited);

  const shownImage = sharpenedImage && viewSharpened ? sharpenedImage : baseImage;
  const shownMime = sharpenedImage && viewSharpened ? "image/png" : baseMimeType;

  return (
    <div className="flex flex-col gap-3">
      {sharpenedImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${shownMime};base64,${shownImage}`}
            alt="Sharpened result"
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }}
          />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.68rem", color: "#fbbf24" }}>AI-enhanced — verify against original</span>
            <button
              type="button"
              onClick={() => setViewSharpened(v => !v)}
              style={{ fontSize: "0.7rem", color: "var(--text3)", background: "none", border: "none", cursor: "pointer", marginLeft: "auto" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
            >
              {viewSharpened ? "View original" : "View sharpened"}
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={sharpenImage} disabled={sharpening} style={pillBtnStyle(accent, sharpening)}>
          {sharpening ? "Sharpening…" : "Sharpen"}
        </button>
        <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>Uses the shared image-edit budget.</span>
      </div>
      {sharpenError && <p style={{ fontSize: "0.75rem", color: "#f87171" }}>{sharpenError}</p>}

      <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
        <Label>Edit this image</Label>
        <div className="flex gap-2">
          <input
            className="form-input"
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value.slice(0, MAX_EDIT_PROMPT_LEN))}
            placeholder="e.g. make the sky sunset orange"
            disabled={editing}
          />
          <button
            type="button"
            onClick={applyEdit}
            disabled={editing || !editPrompt.trim()}
            style={pillBtnStyle(accent, editing || !editPrompt.trim())}
          >
            {editing ? "Editing…" : "Apply edit"}
          </button>
        </div>
        <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>
          Replaces the image above with the edited version. Uses the shared image-edit budget.
        </span>
        {editError && <p style={{ fontSize: "0.75rem", color: "#f87171" }}>{editError}</p>}
      </div>
    </div>
  );
}