"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage, createProgram, makeTexture, setupFullscreenQuad, createDepthSampler, FULLSCREEN_VERT_SRC } from "./webglUtils";

// Fixed-size blur kernel (WebGL1 requires a compile-time loop bound) — each
// tap's offset gets scaled per-pixel by how far that pixel's depth is from
// the chosen focus depth, so only out-of-focus regions actually blur.
const TAPS = [
  [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7],
];

const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform float uFocus;
uniform float uBlurScale;
void main() {
  float depth = texture2D(uDepth, vUv).r;
  float coc = abs(depth - uFocus);
  float blur = coc * uBlurScale;
  vec4 sum = vec4(0.0);
  ${TAPS.map(([dx, dy]) => `sum += texture2D(uImage, vUv + vec2(${dx.toFixed(2)}, ${dy.toFixed(2)}) * blur);`).join("\n  ")}
  gl_FragColor = sum / float(${TAPS.length});
}
`;

/** Simulated shallow depth-of-field ("portrait mode") — blurs everything
 * whose depth is far from the chosen focus point, keeps the focus point
 * sharp. Approximate (a fixed 9-tap box-ish blur, not a true lens circle-
 * of-confusion), same "good enough approximation, not photorealistic"
 * tier as the parallax effect. Click the image to refocus. */
export default function BokehCanvas({
  imageSrc, depthSrc, width, height, displayWidth,
}: { imageSrc: string; depthSrc: string; width: number; height: number; displayWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const focusLocRef = useRef<WebGLUniformLocation | null>(null);
  const blurLocRef = useRef<WebGLUniformLocation | null>(null);
  const depthSamplerRef = useRef<((u: number, v: number) => number) | null>(null);
  const [ready, setReady] = useState(false);
  const [glError, setGlError] = useState(false);
  const [focus, setFocus] = useState(0.5);
  const [blurStrength, setBlurStrength] = useState(0.06);

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
        depthSamplerRef.current = createDepthSampler(depthImg);

        // Default focus: whatever's nearest the image center, a reasonable
        // guess for "the subject" without asking the user to click first.
        setFocus(depthSamplerRef.current(0.5, 0.5));

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

        focusLocRef.current = gl.getUniformLocation(program, "uFocus");
        blurLocRef.current = gl.getUniformLocation(program, "uBlurScale");

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
    if (!gl) return;
    gl.uniform1f(focusLocRef.current, focus);
    gl.uniform1f(blurLocRef.current, blurStrength);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [ready, focus, blurStrength]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const sampler = depthSamplerRef.current;
    if (!sampler) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    setFocus(sampler(u, v));
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
          Blur strength
          <input type="range" min={0} max={0.15} step={0.005} value={blurStrength}
            onChange={e => setBlurStrength(Number(e.target.value))} className="w-40 ml-2" />
        </label>
        <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
          Click anywhere on the image to refocus there.
        </p>
      </div>
    </div>
  );
}
