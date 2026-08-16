"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage, createProgram, makeTexture, setupFullscreenQuad, blurredCanvas, FULLSCREEN_VERT_SRC } from "./webglUtils";

// UV-space displacement amount, scaled by depth (0..1) and pointer offset (-1..1).
const MAX_SHIFT_UV = 0.045;
// Blur radius (px, at the depth map's own resolution) applied only to the
// copy of the depth map used to compute displacement — real object edges
// (e.g. a bike frame against the background) are genuine hard depth jumps,
// but sampling a *displacement field* at a hard edge means neighboring
// screen pixels can pull from very different source UVs, which reads as
// streaky tearing right along the edge once the shift is non-zero.
const DEPTH_BLUR_PX = 3;

const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uPointer;
uniform float uMaxShift;
void main() {
  float depth = texture2D(uDepth, vUv).r; // 0..1, higher = nearer
  vec2 shift = depth * uMaxShift * vec2(uPointer.x * 2.0, uPointer.y * 2.0 * 0.6);
  vec2 sampleUv = clamp(vUv - shift, 0.0, 1.0);
  gl_FragColor = texture2D(uImage, sampleUv);
}
`;

/** True per-pixel depth-driven displacement, via a WebGL fragment shader —
 * not a discrete grid-tile approximation (that approach, tried first, tore
 * visibly apart on high-frequency detail like bicycle spokes sitting right
 * next to a very different-depth background: neighboring tiles shifted by
 * very different amounts and exposed gaps between them). Sampling every
 * pixel's own depth value and displacing continuously has no tile
 * boundaries to tear at — the whole point of moving this to the GPU. */
export default function ParallaxCanvas({
  imageSrc, depthSrc, width, height, displayWidth,
}: { imageSrc: string; depthSrc: string; width: number; height: number; displayWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const pointerLocRef = useRef<WebGLUniformLocation | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [glError, setGlError] = useState(false);

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
        const depthTex = makeTexture(gl, blurredCanvas(depthImg, DEPTH_BLUR_PX));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTex);
        gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.uniform1i(gl.getUniformLocation(program, "uDepth"), 1);

        gl.uniform1f(gl.getUniformLocation(program, "uMaxShift"), MAX_SHIFT_UV);
        pointerLocRef.current = gl.getUniformLocation(program, "uPointer");

        setReady(true);
      } catch {
        setGlError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [imageSrc, depthSrc]);

  useEffect(() => {
    if (!ready) return;
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const pointerLoc = pointerLocRef.current;
    if (!gl || !canvas || !container) return;

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const draw = () => {
      gl.uniform2f(pointerLoc, pointerRef.current.x, pointerRef.current.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => { draw(); rafRef.current = null; });
      }
    };
    const onLeave = () => { pointerRef.current = { x: 0, y: 0 }; draw(); };

    draw();
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);
    return () => {
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, dispW, dispH]);

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden mx-auto"
      style={{ width: dispW, height: dispH, background: "#0a0f1a", touchAction: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: glError ? "none" : "block" }} />
      {glError && <img src={imageSrc} alt="" className="w-full h-full object-cover" />}
      {!ready && !glError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "var(--text3)" }}>
          Loading…
        </div>
      )}
    </div>
  );
}
