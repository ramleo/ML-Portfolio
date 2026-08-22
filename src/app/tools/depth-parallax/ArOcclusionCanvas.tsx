"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage, createProgram, makeTexture, setupFullscreenQuad, FULLSCREEN_VERT_SRC } from "./webglUtils";

const MARKER_RADIUS_UV = 0.06;
const MARKER_COLOR: [number, number, number] = [0.98, 0.35, 0.55]; // pink — reads clearly against most photos

const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform sampler2D uMarkerTex;
uniform vec2 uMarkerUv;
uniform float uVirtualDepth;
uniform float uHasMarker;
uniform float uHasMarkerImage;
uniform float uAspect;
uniform vec3 uMarkerColor;

// Occlusion needs "is anything real near HERE", not "what's the average
// real depth near here" — averaging (a blur) always drags a thin near
// object (a branch, a wire) toward its much larger far neighbor (the sky
// around it), letting the marker bleed through exactly the gaps a real
// object has. Taking the MAX depth in a small neighborhood instead means
// any nearby near-content wins outright, which is what "hide behind it"
// actually requires — a small dilation of the true silhouette, not a
// smeared, biased average of it.
const float KERNEL_STEP = 0.0035;
float nearestRealDepth(vec2 uv, sampler2D depthTex) {
  float m = 0.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) * KERNEL_STEP;
      m = max(m, texture2D(depthTex, uv + offset).r);
    }
  }
  return m;
}

void main() {
  vec4 sceneColor = texture2D(uImage, vUv);
  if (uHasMarker < 0.5) { gl_FragColor = sceneColor; return; }

  vec2 diff = vUv - uMarkerUv;
  diff.y *= uAspect;
  float dist = length(diff);
  float edge = smoothstep(0.062, 0.044, dist); // soft alpha falloff at the marker's own boundary
  if (edge <= 0.0) { gl_FragColor = sceneColor; return; }

  float realDepth = nearestRealDepth(vUv, uDepth);
  // Real content nearer than the virtual object's assigned depth wins —
  // this is the whole point: the marker only draws where nothing real is
  // in front of it. Faded over a depth band (not a single-step cutoff) so
  // the transition itself reads as a gradient, not a hard line — the
  // max-filter above (not this band) is what stops it from bleeding
  // through gaps in near content, so this can be widened freely for a
  // smoother look without reintroducing that bleed-through bug.
  float visibility = 1.0 - smoothstep(uVirtualDepth - 0.015, uVirtualDepth + 0.035, realDepth);
  if (visibility <= 0.0) { gl_FragColor = sceneColor; return; }
  edge *= visibility;

  if (uHasMarkerImage > 0.5) {
    vec2 localUv = diff / 0.12 + 0.5;
    vec4 markerTexel = texture2D(uMarkerTex, localUv);
    vec3 blended = mix(sceneColor.rgb, markerTexel.rgb, markerTexel.a * edge);
    gl_FragColor = vec4(blended, 1.0);
  } else {
    vec3 markerBlend = mix(sceneColor.rgb, uMarkerColor, 0.88 * edge);
    gl_FragColor = vec4(markerBlend, 1.0);
  }
}
`;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Demonstrates depth-aware AR occlusion: place a marker on the photo, pick
 * how "deep" it should sit, and it correctly disappears behind whatever
 * real content in the photo is actually nearer to the camera at that
 * point — instead of always floating on top like a naive sticker overlay.
 * The marker is a plain pink dot by default (a stand-in for "any virtual
 * object"), but a user-uploaded image can replace it — same occlusion
 * logic either way, only the fragment shader's fill differs. */
export default function ArOcclusionCanvas({
  imageSrc, depthSrc, width, height, displayWidth,
}: { imageSrc: string; depthSrc: string; width: number; height: number; displayWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const locsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const [ready, setReady] = useState(false);
  const [glError, setGlError] = useState(false);
  const [markerUv, setMarkerUv] = useState<{ u: number; v: number } | null>(null);
  const [virtualDepth, setVirtualDepth] = useState(0.5);
  const [markerImageSrc, setMarkerImageSrc] = useState<string | null>(null);

  const dispW = displayWidth; // always fill the requested display width, even upscaling small source photos
  const dispH = Math.round((dispW * height) / width);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctxOpts = { preserveDrawingBuffer: true };
      const gl = (canvas.getContext("webgl2", ctxOpts) || canvas.getContext("webgl", ctxOpts)) as WebGLRenderingContext | null;
      if (!gl) { setGlError(true); return; }
      glRef.current = gl;

      try {
        const [img, depthImg] = await Promise.all([loadImage(imageSrc), loadImage(depthSrc)]);
        if (cancelled) return;

        const program = createProgram(gl, FULLSCREEN_VERT_SRC, FRAG_SRC);
        gl.useProgram(program);
        setupFullscreenQuad(gl, program);

        const imageTex = makeTexture(gl, img);
        const depthTex = makeTexture(gl, depthImg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTex);
        gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.uniform1i(gl.getUniformLocation(program, "uDepth"), 1);
        gl.uniform1i(gl.getUniformLocation(program, "uMarkerTex"), 2);
        gl.uniform3f(gl.getUniformLocation(program, "uMarkerColor"), ...MARKER_COLOR);
        gl.uniform1f(gl.getUniformLocation(program, "uAspect"), dispW / dispH);

        locsRef.current = {
          markerUv: gl.getUniformLocation(program, "uMarkerUv"),
          virtualDepth: gl.getUniformLocation(program, "uVirtualDepth"),
          hasMarker: gl.getUniformLocation(program, "uHasMarker"),
          hasMarkerImage: gl.getUniformLocation(program, "uHasMarkerImage"),
        };

        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        canvas.width = Math.round(dispW * dpr);
        canvas.height = Math.round(dispH * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);

        setReady(true);
      } catch {
        setGlError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [imageSrc, depthSrc, dispW, dispH]);

  // Loads (or clears) the optional custom marker texture whenever the user
  // uploads/removes an image — independent of the main draw effect since
  // this is its own async image load.
  useEffect(() => {
    if (!ready) return;
    const gl = glRef.current;
    const locs = locsRef.current;
    if (!gl) return;

    let cancelled = false;
    (async () => {
      if (!markerImageSrc) {
        gl.uniform1f(locs.hasMarkerImage, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return;
      }
      try {
        const img = await loadImage(markerImageSrc);
        if (cancelled) return;
        const tex = makeTexture(gl, img);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1f(locs.hasMarkerImage, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } catch {
        gl.uniform1f(locs.hasMarkerImage, 0);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, markerImageSrc]);

  useEffect(() => {
    if (!ready) return;
    const gl = glRef.current;
    const locs = locsRef.current;
    if (!gl) return;
    gl.uniform1f(locs.hasMarker, markerUv ? 1 : 0);
    if (markerUv) gl.uniform2f(locs.markerUv, markerUv.u, markerUv.v);
    gl.uniform1f(locs.virtualDepth, virtualDepth);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [ready, markerUv, virtualDepth]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // The shader's vUv space has v=0 at screen BOTTOM (from the fullscreen
    // quad's aPos*0.5+0.5 mapping), but a DOM click's Y is naturally 0 at
    // screen TOP — without flipping, a click near the top placed the
    // marker near the bottom and vice versa.
    setMarkerUv({
      u: (e.clientX - rect.left) / rect.width,
      v: 1 - (e.clientY - rect.top) / rect.height,
    });
  };

  const onMarkerImageSelected = async (file: File) => {
    setMarkerImageSrc(await readFileAsDataUrl(file));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-xl overflow-hidden mx-auto" style={{ width: dispW, height: dispH, background: "var(--bg)" }}>
        <canvas ref={canvasRef} onClick={onClick} style={{ width: "100%", height: "100%", display: glError ? "none" : "block", cursor: "crosshair" }} />
        {glError && <img src={imageSrc} alt="" className="w-full h-full object-cover" />}
        {!ready && !glError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "var(--text3)" }}>
            Loading…
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 max-w-xs mx-auto w-full">
        <label className="text-[10px] flex items-center justify-between" style={{ color: "var(--text3)" }}>
          Virtual object depth (far → near)
          <input type="range" min={0} max={1} step={0.01} value={virtualDepth}
            onChange={e => setVirtualDepth(Number(e.target.value))} className="w-40 ml-2" />
        </label>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-[10px] px-2.5 py-1 rounded-md border transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
            {markerImageSrc ? "Change marker image" : "Use my own image as the marker"}
          </button>
          {markerImageSrc && (
            <button onClick={() => setMarkerImageSrc(null)}
              className="text-[10px] px-2.5 py-1 rounded-md border transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Reset to dot
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onMarkerImageSelected(f); e.target.value = ""; }} />
        </div>
        <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
          {markerUv
            ? "Click anywhere to move the marker there. Drag the slider — it disappears wherever something real in the photo is actually nearer to the camera."
            : "Click anywhere on the image to place a marker (a stand-in for \"any virtual object\")."}
        </p>
      </div>
    </div>
  );
}
