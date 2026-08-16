// A quad spanning a real depth edge (e.g. bike silhouette against the
// background) gets one corner near and the diagonal corner far — naive
// displacement stretches that into a tall, spiky triangle. Averaging a
// small neighborhood softens the worst of it; discarding quads whose
// corners still disagree by more than this after smoothing turns the
// remaining hard edges into a clean gap instead of a stretched spike.
const SMOOTH_RADIUS = 1;
const DISCONTINUITY_THRESHOLD = 0.22;

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
 * Depth is smoothed before use and quads spanning a hard depth edge (a real
 * object boundary, not sensor noise) are skipped rather than drawn — a
 * first version drew every quad regardless, and object silhouettes turned
 * into ugly stretched spikes where the foreground met a very different
 * background depth. */
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
      const z = gridAt(r, c) * depthScale;
      positions[p++] = x; positions[p++] = y; positions[p++] = z;
      uvs[t++] = u; uvs[t++] = v;
    }
  }

  // Uint16 (not Uint32) so this never needs the OES_element_index_uint
  // extension — safe as long as vertex count stays under 65536, true for
  // any reasonable cols/rows here. Over-allocated (not every quad survives
  // the discontinuity check) and sliced down to the real count at the end.
  const indices = new Uint16Array(cols * rows * 6);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const cIdx = a + (cols + 1);
      const d = cIdx + 1;

      const corners = [gridAt(r, c), gridAt(r, c + 1), gridAt(r + 1, c), gridAt(r + 1, c + 1)];
      const spread = Math.max(...corners) - Math.min(...corners);
      if (spread > DISCONTINUITY_THRESHOLD) continue;

      indices[i++] = a; indices[i++] = cIdx; indices[i++] = b;
      indices[i++] = b; indices[i++] = cIdx; indices[i++] = d;
    }
  }

  return { positions, uvs, indices: indices.slice(0, i) };
}
