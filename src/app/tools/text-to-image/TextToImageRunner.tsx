"use client";

import { useState } from "react";
import {
  useTextToImageRunner, MAX_PROMPT_LEN, MAX_NEGATIVE_PROMPT_LEN,
  STYLE_OPTIONS, ASPECT_RATIO_OPTIONS,
} from "./useTextToImageRunner";

// Card chrome matches ProjectCard.tsx (the homepage's "Live ML Apps" cards) —
// var(--bg-glass) + backdrop blur + var(--border) + a colored 3px top bar in
// the page's own accent, instead of this page's previous plain dark card.
function Card({ accent, children }: { accent: string; children: React.ReactNode }) {
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

function Label({ children }: { children: React.ReactNode }) {
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

export default function TextToImageRunner({ accent }: { accent: string }) {
  const {
    prompt, setPrompt,
    style, setStyle,
    aspectRatio, setAspectRatio,
    negativePrompt, setNegativePrompt,
    generating, resultImage, resultMimeType, error, generate,
  } = useTextToImageRunner();
  const overLimit = prompt.length > MAX_PROMPT_LEN;
  const negativeOverLimit = negativePrompt.length > MAX_NEGATIVE_PROMPT_LEN;
  const dataUri = resultImage ? `data:${resultMimeType};base64,${resultImage}` : null;
  const extension = resultMimeType.split("/")[1] ?? "png";
  const [btnHover, setBtnHover] = useState(false);

  const download = () => {
    if (!dataUri) return;
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `generated-image.${extension}`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
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

        <div className="flex items-center justify-between gap-3">
          <span style={{ fontSize: "0.7rem", color: overLimit ? "#f87171" : "var(--text3)" }}>
            {prompt.length} / {MAX_PROMPT_LEN}
          </span>
          {/* Same pill-button treatment as ProjectCard's "Launch App": solid
             accent fill, white text, rounded-full, hover lift + opacity. */}
          <button
            onClick={generate}
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

      {resultImage && (
        <Card accent={accent}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri ?? undefined}
            alt={prompt}
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }}
          />
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
        </Card>
      )}
    </div>
  );
}
