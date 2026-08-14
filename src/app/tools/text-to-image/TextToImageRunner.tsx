"use client";

import {
  useTextToImageRunner, MAX_PROMPT_LEN, MAX_NEGATIVE_PROMPT_LEN,
  STYLE_OPTIONS, ASPECT_RATIO_OPTIONS,
} from "./useTextToImageRunner";

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
};

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
            className="text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors"
            style={active
              ? { background: `${accent}22`, color: accent, borderColor: `${accent}55` }
              : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", borderColor: "rgba(255,255,255,0.1)" }}
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

  const download = () => {
    if (!dataUri) return;
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `generated-image.${extension}`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5 flex flex-col gap-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the image you want — e.g. a lighthouse at sunset"
          rows={4}
          disabled={generating}
          className="w-full rounded-lg px-3 py-2 text-sm bg-black/20 border border-white/10 outline-none resize-none focus:border-white/25 disabled:opacity-60"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Style</span>
          <ChipRow options={STYLE_OPTIONS} value={style} onChange={setStyle} accent={accent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Aspect ratio</span>
          <ChipRow options={ASPECT_RATIO_OPTIONS} value={aspectRatio} onChange={setAspectRatio} accent={accent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Avoid (optional)</span>
          <input
            value={negativePrompt}
            onChange={e => setNegativePrompt(e.target.value)}
            placeholder="e.g. blurry, text, watermark"
            disabled={generating}
            className="w-full rounded-lg px-3 py-1.5 text-xs bg-black/20 border border-white/10 outline-none focus:border-white/25 disabled:opacity-60"
          />
          {negativeOverLimit && (
            <span className="text-[11px] text-red-400">Max {MAX_NEGATIVE_PROMPT_LEN} characters.</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: overLimit ? "#f87171" : "rgba(255,255,255,0.35)" }}>
            {prompt.length} / {MAX_PROMPT_LEN}
          </span>
          <button
            onClick={generate}
            disabled={generating || !prompt.trim() || overLimit || negativeOverLimit}
            className="text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}45` }}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Each generation costs real API credits — a daily limit applies.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {resultImage && (
        <div style={cardStyle} className="p-5 flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri ?? undefined}
            alt={prompt}
            className="w-full rounded-lg border border-white/10"
          />
          <button
            onClick={download}
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition-colors"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}
