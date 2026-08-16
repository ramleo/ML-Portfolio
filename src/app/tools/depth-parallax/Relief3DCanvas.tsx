"use client";

import { useEffect, useRef, useState } from "react";
import { loadImage, compileShader, makeTexture, createDepthSampler } from "./webglUtils";
import { buildReliefMesh } from "./reliefMesh";
import * as m4 from "./mat4";

const COLS = 70;
// Near/far shift ratio under camera-shift is CAMERA_DISTANCE /
// (CAMERA_DISTANCE - DEPTH_SCALE) — 2.6/2.0 = 1.3x here, a real, modest,
// verified-in-frame differential. A first version rotated the OBJECT
// instead of shifting the camera — under rotation, a point's screen motion
// is dominated by its own x/y position, not its depth (photo width ~1.85
// dwarfs depth range 0.6), which measured as backwards (background moved
// MORE than the foreground). A second version pushed depth scale/camera
// distance to chase a bigger ratio without re-deriving the frustum-fit
// math for the *near* plane specifically (the near content, e.g. a car,
// sits closer to the camera than the frustum was sized for) — its edges
// were clipping even at rest, and any camera shift pushed them fully out
// of frame. Fixed by deriving CAMERA_DISTANCE/DEPTH_SCALE/FOV_RAD together
// so the near plane (CAMERA_DISTANCE - DEPTH_SCALE, the most restrictive
// case) has real margin, not just the far/base plane.
const DEPTH_SCALE = 0.6;
const CAMERA_DISTANCE = 2.6;
// A wide FOV (75deg, tried first) leaves a large safety margin around the
// photo at rest so no camera shift ever clips it — but that margin reads
// as "the photo shrunk," since it's dead canvas space visible even before
// dragging. Narrowing the FOV keeps the exact same zero-clip guarantee
// (the margin formula below still holds), just makes the margin itself
// smaller: the photo now fills ~87% of the frame at rest instead of ~65%,
// at the cost of a smaller (but still real) camera-shift range.
const FOV_RAD = (60 * Math.PI) / 180;
// Fraction of the near plane's remaining frustum margin (after the object
// itself) allowed as camera shift range — computed from the photo's own
// aspect ratio at setup, not a fixed constant, since a fixed value doesn't
// stay safe across different photo shapes (portrait vs. landscape). See
// the ready-effect below for the actual computation.
const CAM_SHIFT_MARGIN_FRACTION = 0.6;
// Viewed with the camera dead-center, a relief looks completely flat —
// there's no way to see depth without some camera movement. A brief
// automatic shift on load proves the 3D is real without requiring the
// user to already know to drag.
const PEEK_DURATION_MS = 1400;

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUv;
varying vec2 vUv;
uniform mat4 uMVP;
void main() {
  vUv = aUv;
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
void main() {
  gl_FragColor = texture2D(uImage, vUv);
}
`;

/** Renders the photo as a displaced-mesh "bas-relief" — real 3D geometry
 * (not a screen-space trick like the Parallax tab), viewed by dragging to
 * shift the CAMERA sideways (not rotating the object — see CAM_SHIFT_LIMIT
 * above for why that distinction is load-bearing here, not stylistic).
 * This is the honest ceiling of what a single photo's depth map supports:
 * a relief you can look around a little, not a walk-around 3D model — shift
 * too far and you'd see the unphotographed sides of things stretch, since a
 * single camera only ever sees one side. */
export default function Relief3DCanvas({
  imageSrc, depthSrc, width, height, displayWidth,
}: { imageSrc: string; depthSrc: string; width: number; height: number; displayWidth: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const mvpLocRef = useRef<WebGLUniformLocation | null>(null);
  const indexCountRef = useRef(0);
  const projRef = useRef<m4.Mat4 | null>(null);
  const camRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startCamX: number; startCamY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [glError, setGlError] = useState(false);

  const dispW = displayWidth; // always fill the requested display width, even upscaling small source photos
  const dispH = Math.round((dispW * height) / width);
  const aspect = width / height;

  // Derived from the actual frustum geometry, not a fixed constant — a
  // fixed shift limit was exactly what caused the near content to clip out
  // of frame in a previous version. Computed from the NEAR plane (the most
  // restrictive depth, since near content occupies more of the frustum),
  // for both the width budget (scales with aspect) and height budget
  // (doesn't), taking the smaller of the two so neither axis can clip.
  const nearPlaneMarginFactor = (CAMERA_DISTANCE - DEPTH_SCALE) * Math.tan(FOV_RAD / 2) - 1;
  const camShiftLimit = CAM_SHIFT_MARGIN_FRACTION * Math.max(0, Math.min(nearPlaneMarginFactor * aspect, nearPlaneMarginFactor));

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
        const depthAt = createDepthSampler(depthImg);

        const rows = Math.max(1, Math.round(COLS / aspect));
        const { positions, uvs, indices } = buildReliefMesh(depthAt, COLS, rows, aspect, DEPTH_SCALE);
        indexCountRef.current = indices.length;

        const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
        const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
        const program = gl.createProgram()!;
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link failed");
        gl.useProgram(program);

        const posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        const uvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        const uvLoc = gl.getAttribLocation(program, "aUv");
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

        const idxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        const tex = makeTexture(gl, img);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);

        mvpLocRef.current = gl.getUniformLocation(program, "uMVP");
        projRef.current = m4.perspective(FOV_RAD, dispW / dispH, 0.1, 10);

        gl.enable(gl.DEPTH_TEST);
        // No back-face culling — the rotation range is small enough that
        // winding direction never matters here, and skipping it removes any
        // risk of the whole mesh vanishing from a winding-order mistake.

        setReady(true);
      } catch {
        setGlError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [imageSrc, depthSrc, aspect, dispW, dispH]);

  useEffect(() => {
    if (!ready) return;
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const proj = projRef.current;
    const mvpLoc = mvpLocRef.current;
    if (!gl || !canvas || !proj) return;

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const draw = () => {
      const { x: camX, y: camY } = camRef.current;
      // No model rotation at all — the object never moves. Only the camera
      // shifts, which is what makes near points move more than far points
      // (see CAM_SHIFT_LIMIT above for why that's the whole point).
      const view = m4.translate(-camX, -camY, -CAMERA_DISTANCE);
      const mvp = m4.multiply(proj, view);
      gl.clearColor(0.04, 0.06, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(mvpLoc, false, mvp);
      gl.drawElements(gl.TRIANGLES, indexCountRef.current, gl.UNSIGNED_SHORT, 0);
    };

    const requestDraw = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(() => { draw(); rafRef.current = null; });
    };

    const onPointerDown = (e: PointerEvent) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, startCamX: camRef.current.x, startCamY: camRef.current.y };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      // Dragging right moves the viewpoint right, same sense as physically
      // leaning to look around an object from that side.
      const camX = Math.max(-camShiftLimit, Math.min(camShiftLimit, drag.startCamX + (dx / canvas.clientWidth) * camShiftLimit * 2));
      const camY = Math.max(-camShiftLimit, Math.min(camShiftLimit, drag.startCamY - (dy / canvas.clientHeight) * camShiftLimit * 2));
      camRef.current = { x: camX, y: camY };
      requestDraw();
    };
    const onPointerUp = () => { dragRef.current = null; };

    draw();
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // One-time "peek" animation: shift the camera out and back so the
    // relief visibly proves it's real 3D before the user has to know to
    // drag it. Bails immediately if the user starts dragging mid-animation.
    let peekRaf: number | null = null;
    const peekStart = performance.now();
    const peek = (now: number) => {
      if (dragRef.current) return;
      const t = Math.min(1, (now - peekStart) / PEEK_DURATION_MS);
      const eased = Math.sin(t * Math.PI); // 0 -> 1 -> 0
      camRef.current = { x: eased * camShiftLimit * 0.7, y: camRef.current.y };
      draw();
      if (t < 1) peekRaf = requestAnimationFrame(peek);
    };
    peekRaf = requestAnimationFrame(peek);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (peekRaf != null) cancelAnimationFrame(peekRaf);
    };
  }, [ready, dispW, dispH, camShiftLimit]);

  return (
    <div className="relative rounded-xl overflow-hidden mx-auto"
      style={{ width: dispW, height: dispH, background: "#0a0f1a", touchAction: "none", cursor: "grab" }}>
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
