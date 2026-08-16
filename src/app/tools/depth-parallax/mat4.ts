// Minimal column-major 4x4 matrix helpers — just enough for a static
// perspective camera and a rotate-in-place object, no external dependency
// for what's otherwise a handful of numbers.
export type Mat4 = Float32Array;

export function identity(): Mat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function perspective(fovyRad: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function translate(tx: number, ty: number, tz: number): Mat4 {
  const m = identity();
  m[12] = tx; m[13] = ty; m[14] = tz;
  return m;
}

export function rotateX(rad: number): Mat4 {
  const c = Math.cos(rad), s = Math.sin(rad);
  const m = identity();
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}

export function rotateY(rad: number): Mat4 {
  const c = Math.cos(rad), s = Math.sin(rad);
  const m = identity();
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}
