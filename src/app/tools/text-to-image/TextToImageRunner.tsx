"use client";

import { useTextToImageRunner, MAX_PROMPT_LEN } from "./useTextToImageRunner";

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
};

export default function TextToImageRunner({ accent }: { accent: string }) {
  const { prompt, setPrompt, generating, resultImage, resultMimeType, error, generate } = useTextToImageRunner();
  const overLimit = prompt.length > MAX_PROMPT_LEN;
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
          placeholder="Describe the image you want — e.g. a lighthouse at sunset, watercolor style"
          rows={4}
          disabled={generating}
          className="w-full rounded-lg px-3 py-2 text-sm bg-black/20 border border-white/10 outline-none resize-none focus:border-white/25 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: overLimit ? "#f87171" : "rgba(255,255,255,0.35)" }}>
            {prompt.length} / {MAX_PROMPT_LEN}
          </span>
          <button
            onClick={generate}
            disabled={generating || !prompt.trim() || overLimit}
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
