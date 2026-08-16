"use client";

import { useRef, useState } from "react";
import { useDepthEstimate } from "./useDepthEstimate";
import ParallaxCanvas from "./ParallaxCanvas";
import BokehCanvas from "./BokehCanvas";
import ArOcclusionCanvas from "./ArOcclusionCanvas";

const ERROR_COLOR = "#f87171";
const DISPLAY_MAX_WIDTH = 760;

type View = "parallax" | "depth" | "bokeh" | "ar";
const VIEWS: { id: View; label: string }[] = [
  { id: "parallax", label: "Parallax" },
  { id: "depth", label: "Depth map" },
  { id: "bokeh", label: "Bokeh" },
  { id: "ar", label: "AR occlusion" },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

const VIEW_CAPTIONS: Record<View, string> = {
  parallax: "Move your pointer over the image — near objects shift more than far ones, sampled per pixel from the estimated depth map.",
  depth: "Relative depth only — brighter means nearer to the camera, not an exact distance.",
  bokeh: "Simulated shallow depth-of-field, driven by the same depth map — click to refocus.",
  ar: "A minimal demo of depth-aware occlusion for AR overlays — click to place a marker, then adjust its depth.",
};

/** Upload a photo → server estimates a depth map → four ways to use it:
 * a live parallax diorama, the raw depth map, a simulated bokeh/portrait
 * effect, and a depth-aware AR occlusion demo. All four reuse the same one
 * server call — everything downstream is local WebGL. */
export default function DepthParallaxRunner({ accent }: { accent: string }) {
  const { loading, result, error, run, reset } = useDepthEstimate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [view, setView] = useState<View>("parallax");

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
    fontSize: 12, padding: "6px 14px", borderRadius: 8, fontWeight: 600,
    background: active ? accent : "transparent",
    color: active ? "#0b0b12" : "var(--text3)",
    border: active ? "none" : "1px solid rgba(255,255,255,0.12)",
  });

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-6">
        <p className="text-sm mb-4" style={{ color: "var(--text3)" }}>
          Upload a single photo and get a per-pixel depth map, then explore it four ways: a live
          parallax diorama, the raw depth map, a simulated portrait-mode blur, and a depth-aware AR
          occlusion demo. Pure local ONNX + WebGL, no API key or budget cost.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} disabled={loading}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Estimating depth…" : "Upload a photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); e.target.value = ""; }} />
        </div>

        {error && <p className="text-xs mt-2" style={{ color: ERROR_COLOR }}>{error}</p>}
      </div>

      {imageSrc && result && (
        <div style={cardStyle} className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={tabStyle(view === v.id)}>{v.label}</button>
            ))}
          </div>

          <div className="flex flex-col gap-3 items-center">
            {view === "parallax" && (
              <ParallaxCanvas imageSrc={imageSrc} depthSrc={result.depthMapUrl} width={result.width} height={result.height} displayWidth={DISPLAY_MAX_WIDTH} />
            )}
            {view === "depth" && (
              <img src={result.depthMapUrl} alt="Estimated depth map"
                className="rounded-xl" style={{ maxWidth: DISPLAY_MAX_WIDTH, width: "100%" }} />
            )}
            {view === "bokeh" && (
              <BokehCanvas imageSrc={imageSrc} depthSrc={result.depthMapUrl} width={result.width} height={result.height} displayWidth={DISPLAY_MAX_WIDTH} />
            )}
            {view === "ar" && (
              <ArOcclusionCanvas imageSrc={imageSrc} depthSrc={result.depthMapUrl} width={result.width} height={result.height} displayWidth={DISPLAY_MAX_WIDTH} />
            )}
            <p className="text-xs text-center max-w-2xl" style={{ color: "var(--text3)" }}>
              {VIEW_CAPTIONS[view]}
              {view === "parallax" && " This is a per-pixel WebGL shader, not a discrete tile grid."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
