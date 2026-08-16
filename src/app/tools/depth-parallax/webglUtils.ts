export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${info}`);
  }
  return shader;
}

export function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "program link failed");
  }
  return program;
}

export function makeTexture(gl: WebGLRenderingContext, img: HTMLImageElement): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Without this, WebGL uploads the image's rows in their on-disk order
  // (top row first) into a texture space where v=0 is conventionally the
  // BOTTOM — every WebGL view (parallax/bokeh/AR occlusion/3D relief) ends
  // up upside down. This is the single shared fix point for all of them.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/** Binds a full-screen [-1,1] quad to `aPos` in the given program — every
 * depth-shader mode (parallax/bokeh/AR occlusion) renders by sampling
 * per-fragment over this same quad, only the fragment shader differs. */
export function setupFullscreenQuad(gl: WebGLRenderingContext, program: WebGLProgram) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
}

/** Decodes a depth-map image into a small CPU-side grid once, so UI
 * interactions (click-to-focus for bokeh, click-to-place for AR occlusion)
 * can cheaply look up "what's the depth at this point the user clicked",
 * independent of the GPU texture the shaders sample from every frame. */
export function createDepthSampler(depthImg: HTMLImageElement) {
  const gridW = Math.min(128, depthImg.naturalWidth);
  const gridH = Math.round((gridW * depthImg.naturalHeight) / depthImg.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(depthImg, 0, 0, gridW, gridH);
  const data = ctx.getImageData(0, 0, gridW, gridH).data;

  return (u: number, v: number): number => {
    const x = Math.min(gridW - 1, Math.max(0, Math.round(u * (gridW - 1))));
    const y = Math.min(gridH - 1, Math.max(0, Math.round(v * (gridH - 1))));
    return data[(y * gridW + x) * 4] / 255;
  };
}

export const FULLSCREEN_VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
