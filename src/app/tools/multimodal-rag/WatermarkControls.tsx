"use client";

import { downloadBase64Image } from "./imageComposite";
import { useWatermark } from "./useWatermark";

const ACCENT_WM = "#38bdf8"; // distinct from the other per-action accents in this panel

type Props = {
  /** Whichever image is currently on screen (sharpened/edited/original — same
   * precedence the existing Download button already uses), not the raw
   * upload — a watermark embedded before the user's edits would just get
   * overwritten by them. */
  img: string;
  source: string;
  page: number;
};

/** "Embed watermark" / "Verify watermark" — invisible DCT/QIM watermark,
 * pure local image processing (routers/rag/mm_watermark.py), no API cost.
 * Embed downloads a watermarked copy immediately rather than replacing what's
 * on screen — watermarking is meant for a copy you're about to share/export,
 * not a destructive edit to the working image. */
export default function WatermarkControls({ img, source, page }: Props) {
  const { embedding, verifying, verifyResult, error, embed, verify, clearVerify } = useWatermark();

  const handleEmbed = async () => {
    clearVerify();
    const watermarked = await embed(img, "MLU-VERIFIED");
    if (watermarked) downloadBase64Image(watermarked, `${source.replace(/\.[^/.]+$/, "")}-page${page}-watermarked.png`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={handleEmbed} disabled={embedding}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: `${ACCENT_WM}40`, color: ACCENT_WM, opacity: embedding ? 0.5 : 1 }}>
        {embedding ? "Embedding…" : "Embed watermark"}
      </button>
      <button onClick={() => verify(img)} disabled={verifying}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: `${ACCENT_WM}40`, color: ACCENT_WM, opacity: verifying ? 0.5 : 1 }}>
        {verifying ? "Checking…" : "Verify watermark"}
      </button>
      {verifyResult && (
        <span className="text-[9px]" style={{ color: verifyResult.present ? "#34d399" : "var(--text2)" }}>
          {verifyResult.present
            ? `✓ "${verifyResult.label}" (${Math.round(verifyResult.confidence * 100)}%)`
            : "No watermark detected"}
        </span>
      )}
      {error && <span className="text-[9px]" style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}
