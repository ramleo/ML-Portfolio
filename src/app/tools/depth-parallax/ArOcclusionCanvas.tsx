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
uniform vec2 uMarkerUv;
uniform float uVirtualDepth;
uniform float uHasMarker;
uniform float uAspect;
uniform vec3 uMarkerColor;
void main() {
  vec4 sceneColor = texture2D(uImage, vUv);
  if (uHasMarker < 0.5) { gl_FragColor = sceneColor; return; }

  vec2 diff = vUv - uMarkerUv;
  diff.y *= uAspect;
  float dist = length(diff);
  float edge = smoothstep(0.06, 0.05, dist);
  if (edge <= 0.0) { gl_FragColor = sceneColor; return; }

  float realDepth = texture2D(uDepth, vUv).r;
  // Real content nearer than the virtual object's assigned depth wins —
  // this is the whole point: the marker only draws where nothing real is
  // in front of it.
  bool occluded = realDepth > uVirtualDepth + 0.03;
  vec3 markerBlend = mix(sceneColor.rgb, uMarkerColor, 0.88 * edge);
  gl_FragColor = occluded ? sceneColor : vec4(markerBlend, 1.0);
}
`;

/** Demonstrates depth-aware AR occlusion: place a marker on the photo, pick
 * how "deep" it should sit, and it correctly disappears behind whatever
 * real content in the photo is actually nearer to the camera at that
 * point — instead of always floating on top like a naive sticker overlay. */
export default function ArOcclusionCanvas({
  imageSrc, depthSrc, width, height, displayWidth,
}: { imageSrc: string; depthSrc: string; width: number; height: number; displayWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const locsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const [ready, setReady] = useState(false);
  const [glError, setGlError] = useState(false);
  const [markerUv, setMarkerUv] = useState<{ u: number; v: number } | null>(null);
  const [virtualDepth, setVirtualDepth] = useState(0.5);

  const dispW = Math.min(displayWidth, width);
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
        gl.uniform3f(gl.getUniformLocation(program, "uMarkerColor"), ...MARKER_COLOR);
        gl.uniform1f(gl.getUniformLocation(program, "uAspect"), dispW / dispH);

        locsRef.current = {
          markerUv: gl.getUniformLocation(program, "uMarkerUv"),
          virtualDepth: gl.getUniformLocation(program, "uVirtualDepth"),
          hasMarker: gl.getUniformLocation(program, "uHasMarker"),
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
    setMarkerUv({ u: (e.clientX - rect.left) / rect.width, v: (e.clientY - rect.top) / rect.height });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-xl overflow-hidden mx-auto" style={{ width: dispW, height: dispH, background: "#0a0f1a" }}>
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
        <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
          {markerUv
            ? "Drag the slider — the marker disappears wherever something real in the photo is actually nearer to the camera."
            : "Click anywhere on the image to place a marker."}
        </p>
      </div>
    </div>
  );
}
