/** Builds a subdivided plane mesh displaced by depth — a "bas-relief" of
 * the photo: flat in x/y, pushed toward the camera where the depth map says
 * something is near. This is the honest ceiling of monocular depth: only
 * the camera-facing surface was ever seen, so this deliberately supports
 * only a small rotation range (see ROTATE_LIMIT_RAD in Relief3DCanvas) —
 * rotate further and you'd see the unphotographed sides stretch. */
export function buildReliefMesh(
  depthAt: (u: number, v: number) => number,
  cols: number,
  rows: number,
  aspect: number,
  depthScale: number,
) {
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  let p = 0, t = 0;

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const depth = depthAt(u, v); // 0..1, higher = nearer
      const x = (u - 0.5) * 2 * aspect;
      const y = (0.5 - v) * 2;
      const z = depth * depthScale;
      positions[p++] = x; positions[p++] = y; positions[p++] = z;
      uvs[t++] = u; uvs[t++] = v;
    }
  }

  // Uint16 (not Uint32) so this never needs the OES_element_index_uint
  // extension — safe as long as vertex count stays under 65536, true for
  // any reasonable cols/rows here.
  const indices = new Uint16Array(cols * rows * 6);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const cIdx = a + (cols + 1);
      const d = cIdx + 1;
      indices[i++] = a; indices[i++] = cIdx; indices[i++] = b;
      indices[i++] = b; indices[i++] = cIdx; indices[i++] = d;
    }
  }

  return { positions, uvs, indices };
}
