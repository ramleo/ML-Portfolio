// A first version discarded any mesh quad whose corners disagreed too much
// after only a light smooth — that assumed depth is mostly flat with a few
// clean object-boundary edges. Real photos aren't: bike spokes alternate
// near/far every few pixels, gravel and leaves are naturally noisy at this
// scale, so that approach punched holes all over the mesh, not just at the
// bike's silhouette. The fix is heavier smoothing of the GEOMETRY only —
// the color texture on top stays sharp regardless, the mesh underneath just
// needs to capture broad shape, not every strand — and no discarding at all.
const SMOOTH_RADIUS = 5;

// Depth is pushed toward zero over this many grid cells approaching every
// edge. Without this, the mesh's own outer boundary carries whatever real
// depth the photo has there (e.g. sky vs. road at a corner) — and since a
// vertex pushed toward the camera projects larger while one pushed away
// projects smaller, a straight photo edge with varying depth along it stops
// projecting as a straight line under perspective. That reads as the whole
// photo being warped/trapezoidal rather than "3D," especially once the
// camera shifts off-center. Feathering keeps every boundary vertex flat
// (zero displacement) so the silhouette always stays a clean rectangle —
// only the interior, where it doesn't affect the outline, bulges with depth.
const EDGE_FEATHER_CELLS = 6;

function edgeFeather(r: number, c: number, rows: number, cols: number): number {
  const dist = Math.min(c, cols - c, r, rows - r);
  const t = Math.min(1, dist / EDGE_FEATHER_CELLS);
  return t * t * (3 - 2 * t); // smoothstep: 0 at the border, 1 past EDGE_FEATHER_CELLS in
}

function smoothedDepthGrid(
  depthAt: (u: number, v: number) => number,
  cols: number,
  rows: number,
): Float32Array {
  const raw = new Float32Array((cols + 1) * (rows + 1));
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) raw[r * (cols + 1) + c] = depthAt(c / cols, r / rows);
  }

  const smoothed = new Float32Array(raw.length);
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      let sum = 0, count = 0;
      for (let dr = -SMOOTH_RADIUS; dr <= SMOOTH_RADIUS; dr++) {
        for (let dc = -SMOOTH_RADIUS; dc <= SMOOTH_RADIUS; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr > rows || cc < 0 || cc > cols) continue;
          sum += raw[rr * (cols + 1) + cc];
          count++;
        }
      }
      smoothed[r * (cols + 1) + c] = sum / count;
    }
  }
  return smoothed;
}

/** Builds a subdivided plane mesh displaced by depth — a "bas-relief" of
 * the photo: flat in x/y, pushed toward the camera where the depth map says
 * something is near. This is the honest ceiling of monocular depth: only
 * the camera-facing surface was ever seen, so this deliberately supports
 * only a small rotation range (see ROTATE_LIMIT_RAD in Relief3DCanvas) —
 * rotate further and you'd see the unphotographed sides stretch.
 *
 * Depth is heavily smoothed before use (see SMOOTH_RADIUS above) so fine
 * real texture (spokes, gravel, leaves) doesn't turn into mesh spikes —
 * the geometry only needs to capture broad shape, the photo texture on top
 * still shows the real detail. */
export function buildReliefMesh(
  depthAt: (u: number, v: number) => number,
  cols: number,
  rows: number,
  aspect: number,
  depthScale: number,
) {
  const depthGrid = smoothedDepthGrid(depthAt, cols, rows);
  const gridAt = (r: number, c: number) => depthGrid[r * (cols + 1) + c];

  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  let p = 0, t = 0;

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const x = (u - 0.5) * 2 * aspect;
      const y = (0.5 - v) * 2;
      const z = gridAt(r, c) * depthScale * edgeFeather(r, c, rows, cols);
      positions[p++] = x; positions[p++] = y; positions[p++] = z;
      // The color texture is uploaded with UNPACK_FLIP_Y_WEBGL (see
      // makeTexture) so v=0 lands on the photo's bottom row, not top — but
      // `v` here still means "top of photo" (matches the depth sampler's
      // natural row order, which the mesh's own y-position depends on
      // correctly). Flip only the texture-sampling coordinate to match.
      uvs[t++] = u; uvs[t++] = 1 - v;
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
