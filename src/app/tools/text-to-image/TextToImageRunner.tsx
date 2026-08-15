"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import {
  useTextToImageRunner, MAX_PROMPT_LEN, MAX_NEGATIVE_PROMPT_LEN,
  STYLE_OPTIONS, ASPECT_RATIO_OPTIONS, VARIATION_COUNTS, type VariationCount,
} from "./useTextToImageRunner";
import { convertImageDataUri } from "./imageUtils";
import TextToImageEditPanel from "./TextToImageEditPanel";
import TextToImageComparisonGrid from "./TextToImageComparisonGrid";

// Card chrome matches ProjectCard.tsx (the homepage's "Live ML Apps" cards) —
// var(--bg-glass) + backdrop blur + var(--border) + a colored 3px top bar in
// the page's own accent, instead of this page's previous plain dark card.
// Exported for reuse by TextToImageEditPanel.tsx (same chrome, kept in one
// place rather than duplicated).
export function Card({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "var(--bg-glass)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    }}>
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {children}
      </div>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
      {children}
    </span>
  );
}

// Same badge-pill formula as ProjectCard's task badge: accent+"22" bg,
// accent text, accent+"44" border when active — var(--border)/var(--text2)
// when not, so it fades into the same neutral chip look the rest of the
// site uses for inactive filters.
function ChipRow({ options, value, onChange, accent }: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string | null) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(active ? null : opt.key)}
            style={{
              fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.02em",
              padding: "3px 12px", borderRadius: 9999, cursor: "pointer",
              transition: "all 0.15s",
              background: active ? `${accent}22` : "var(--border)",
              color: active ? accent : "var(--text2)",
              border: `1px solid ${active ? accent + "44" : "var(--border2)"}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const DOWNLOAD_FORMATS = [
  { key: "image/png", label: "PNG", ext: "png" },
  { key: "image/jpeg", label: "JPEG", ext: "jpg" },
  { key: "image/webp", label: "WebP", ext: "webp" },
] as const;

// Imperative handle so the page-level embedded AI chat (see page.tsx /
// useRagChat.ts's onGenerateImage) can trigger a REAL generation from a
// natural-language chat message ("generate an image of a red fox", or
// "compare anime vs photorealistic style of a red fox") without duplicating
// useTextToImageRunner's validation/budget/history logic — the chat calls
// the exact same generate() the Generate/Variations UI calls, just with an
// explicit prompt (see generate()'s own comment for the override rules).
export interface TextToImageRunnerHandle {
  requestGenerate: (prompt: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
  requestStyleComparison: (prompt: string, styleKeys: string[]) => Promise<{ ok: boolean; error?: string; count?: number }>;
}

const TextToImageRunner = forwardRef<TextToImageRunnerHandle, { accent: string }>(function TextToImageRunner({ accent }, ref) {
  const {
    prompt, setPrompt,
    style, setStyle,
    aspectRatio, setAspectRatio,
    negativePrompt, setNegativePrompt,
    generating, resultImage, resultMimeType, resultLabel, error, generate,
    enhancing, enhancePrompt,
    history, restoreFromHistory, clearHistory, activeHistoryTimestamp,
    applyEditedResult,
    variationCount, setVariationCount, variations, selectVariation,
  } = useTextToImageRunner();

  useImperativeHandle(ref, () => ({
    requestGenerate: (chatPrompt: string) => generate(chatPrompt, 1),
    requestStyleComparison: (chatPrompt: string, styleKeys: string[]) => generate(chatPrompt, undefined, styleKeys),
  }), [generate]);
  const overLimit = prompt.length > MAX_PROMPT_LEN;
  const negativeOverLimit = negativePrompt.length > MAX_NEGATIVE_PROMPT_LEN;
  const dataUri = resultImage ? `data:${resultMimeType};base64,${resultImage}` : null;
  const [btnHover, setBtnHover] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<string>("image/png");

  const download = async () => {
    if (!dataUri) return;
    const fmt = DOWNLOAD_FORMATS.find(f => f.key === downloadFormat) ?? DOWNLOAD_FORMATS[0];
    let href = dataUri;
    if (downloadFormat !== resultMimeType) {
      try {
        href = await convertImageDataUri(dataUri, downloadFormat);
      } catch {
        href = dataUri; // fall back to the original bytes if conversion fails
      }
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = `generated-image.${fmt.ext}`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(380px,460px)_minmax(0,1fr)] gap-6 items-start">
      <Card accent={accent}>
        <textarea
          className="form-input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the image you want — e.g. a lighthouse at sunset"
          rows={4}
          disabled={generating}
          style={{ resize: "none" }}
        />
        <button
          type="button"
          onClick={enhancePrompt}
          disabled={enhancing || generating || !prompt.trim()}
          style={{
            alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.35rem",
            fontSize: "0.72rem", fontWeight: 600, padding: "0.35rem 0.8rem", borderRadius: 9999,
            border: `1px solid ${accent}35`, background: `${accent}12`, color: accent,
            cursor: enhancing || generating || !prompt.trim() ? "default" : "pointer",
            opacity: enhancing || generating || !prompt.trim() ? 0.5 : 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.2 3.6L13 6l-3.8 1.4L8 11l-1.2-3.6L3 6l3.8-1.4L8 1z" fill={accent} />
          </svg>
          {enhancing ? "Enhancing…" : "Enhance prompt"}
        </button>

        <div className="flex flex-col gap-1.5">
          <Label>Style</Label>
          <ChipRow options={STYLE_OPTIONS} value={style} onChange={setStyle} accent={accent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Aspect ratio</Label>
          <ChipRow options={ASPECT_RATIO_OPTIONS} value={aspectRatio} onChange={setAspectRatio} accent={accent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Avoid (optional)</Label>
          <input
            className="form-input"
            value={negativePrompt}
            onChange={e => setNegativePrompt(e.target.value)}
            placeholder="e.g. blurry, text, watermark"
            disabled={generating}
          />
          {negativeOverLimit && (
            <span style={{ fontSize: "0.7rem", color: "#f87171" }}>Max {MAX_NEGATIVE_PROMPT_LEN} characters.</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Variations</Label>
          <div className="flex gap-1.5">
            {VARIATION_COUNTS.map(n => {
              const active = variationCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariationCount(n as VariationCount)}
                  disabled={generating}
                  style={{
                    fontSize: "0.7rem", fontWeight: 600, padding: "3px 12px", borderRadius: 9999,
                    cursor: generating ? "default" : "pointer", transition: "all 0.15s",
                    background: active ? `${accent}22` : "var(--border)",
                    color: active ? accent : "var(--text2)",
                    border: `1px solid ${active ? accent + "44" : "var(--border2)"}`,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {variationCount > 1 && (
            <span style={{ fontSize: "0.68rem", color: "#fbbf24" }}>
              Uses {variationCount} of your daily generation budget per click.
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span style={{ fontSize: "0.7rem", color: overLimit ? "#f87171" : "var(--text3)" }}>
            {prompt.length} / {MAX_PROMPT_LEN}
          </span>
          {/* Same pill-button treatment as ProjectCard's "Launch App": solid
             accent fill, white text, rounded-full, hover lift + opacity. */}
          <button
            onClick={() => generate()}
            disabled={generating || !prompt.trim() || overLimit || negativeOverLimit}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.55rem 1.1rem", borderRadius: 9999,
              background: accent, color: "#fff", fontWeight: 600, fontSize: "0.82rem",
              border: "none", cursor: generating || !prompt.trim() || overLimit || negativeOverLimit ? "default" : "pointer",
              opacity: generating || !prompt.trim() || overLimit || negativeOverLimit ? 0.5 : (btnHover ? 0.88 : 1),
              transform: btnHover && !generating ? "translateY(-1px)" : "translateY(0)",
              transition: "opacity 0.15s, transform 0.15s",
            }}
          >
            {generating ? "Generating…" : "Generate"}
            {!generating && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: "0.7rem", color: "var(--text3)" }}>
          Each generation costs real API credits — a daily limit applies.
        </p>
        {error && <p style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</p>}
      </Card>

      <div className="flex flex-col gap-4">
      {resultImage && (
        <Card accent={accent}>
          <TextToImageComparisonGrid
            accent={accent}
            primary={{ image: resultImage, mimeType: resultMimeType, label: resultLabel ?? undefined }}
            others={variations}
            primaryAlt={prompt}
            onSelect={selectVariation}
          />

          <div className="flex items-center gap-2">
            <select
              value={downloadFormat}
              onChange={e => setDownloadFormat(e.target.value)}
              style={{
                fontSize: "0.75rem", fontWeight: 600, padding: "0.45rem 0.6rem", borderRadius: 9999,
                border: "1px solid var(--border2)", background: "var(--border)", color: "var(--text2)",
                cursor: "pointer",
              }}
            >
              {DOWNLOAD_FORMATS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <button
              onClick={download}
              style={{
                alignSelf: "flex-start", fontSize: "0.78rem", fontWeight: 600,
                padding: "0.45rem 1rem", borderRadius: 9999,
                border: "1px solid var(--border2)", background: "var(--border)", color: "var(--text2)",
                cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text2)"; }}
            >
              Download
            </button>
          </div>

          {resultImage && (
            <TextToImageEditPanel
              accent={accent}
              baseImage={resultImage}
              baseMimeType={resultMimeType}
              onEdited={applyEditedResult}
            />
          )}
        </Card>
      )}

      {history.length > 0 && (
        <Card accent={accent}>
          <div className="flex items-center justify-between">
            <Label>Recent prompts</Label>
            <button
              onClick={clearHistory}
              style={{ fontSize: "0.68rem", color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.map(entry => {
              const isActive = entry.timestamp === activeHistoryTimestamp;
              return (
                <button
                  key={entry.timestamp}
                  onClick={() => restoreFromHistory(entry)}
                  title={entry.prompt}
                  style={{
                    flexShrink: 0, width: 68, height: 68, borderRadius: 10, overflow: "hidden",
                    border: isActive ? `2px solid ${accent}` : "1px solid var(--border2)",
                    boxShadow: isActive ? `0 0 0 2px ${accent}33` : "none",
                    cursor: "pointer", padding: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${entry.mimeType};base64,${entry.image}`}
                    alt={entry.prompt}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--text3)" }}>
            Click a thumbnail to load that image and prompt — stored on this device only, doesn&apos;t re-generate.
          </p>
        </Card>
      )}
      </div>
    </div>
  );
});

export default TextToImageRunner;
