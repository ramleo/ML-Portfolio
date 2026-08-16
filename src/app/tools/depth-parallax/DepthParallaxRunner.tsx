"use client";

import { useRef, useState } from "react";
import { useDepthEstimate } from "./useDepthEstimate";
import ParallaxCanvas from "./ParallaxCanvas";

const ERROR_COLOR = "#f87171";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Upload a photo → server estimates a depth map → toggle between a live
 * parallax "diorama" view (pointer-driven) and the plain depth map itself.
 * No history, no chat integration — the interesting part is the model +
 * effect, not UI surface area, same philosophy as Face Liveness. */
export default function DepthParallaxRunner({ accent }: { accent: string }) {
  const { loading, result, error, run, reset } = useDepthEstimate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [view, setView] = useState<"parallax" | "depth">("parallax");

  const onFileSelected = async (file: File) => {
    reset();
    setView("parallax");
    const dataUrl = await readFileAsDataUrl(file);
    setImageSrc(dataUrl);
    const b64 = dataUrl.split(",")[1] ?? "";
    run(b64);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, padding: "6px 12px", borderRadius: 8, fontWeight: 600,
    background: active ? accent : "transparent",
    color: active ? "#0b0b12" : "var(--text3)",
    border: active ? "none" : "1px solid rgba(255,255,255,0.12)",
  });

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload a single photo and get a per-pixel depth map, then watch it come alive as a live
          parallax diorama — near objects shift more than far ones as you move your pointer over it.
          Pure local ONNX inference, no API key or budget cost.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Estimating depth…" : "Upload a photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = ""; }} />
        </div>

        {error && <p className="text-[11px] mt-2" style={{ color: ERROR_COLOR }}>{error}</p>}
      </div>

      {imageSrc && result && (
        <div style={cardStyle} className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setView("parallax")} style={tabStyle(view === "parallax")}>Parallax</button>
            <button onClick={() => setView("depth")} style={tabStyle(view === "depth")}>Depth map</button>
          </div>

          {view === "parallax" ? (
            <>
              <ParallaxCanvas imageSrc={imageSrc} depthSrc={result.depthMapUrl} width={result.width} height={result.height} />
              <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
                Move your pointer over the image — this is a grid-tile approximation of true depth
                parallax (no WebGL shader here), so expect a mosaic-like feel rather than a perfectly
                smooth shift.
              </p>
            </>
          ) : (
            <img src={result.depthMapUrl} alt="Estimated depth map"
              className="mx-auto rounded-xl" style={{ maxWidth: 480, width: "100%" }} />
          )}
        </div>
      )}
    </div>
  );
}
