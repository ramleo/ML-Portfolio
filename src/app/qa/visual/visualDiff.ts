// Client-side image diff for visual regression. Decodes two base64 PNGs onto a
// canvas and compares them pixel-for-pixel with a colour-distance tolerance —
// changed pixels are painted red over a dimmed base. Kept dependency-free: the
// browser's own canvas does the decode, so no pixelmatch/pngjs bundle is needed.

export type DiffResult = {
  percent: number;        // share of pixels that changed, 0..100
  changed: number;        // count of changed pixels
  total: number;
  diffDataUrl: string;    // PNG data URL with changes highlighted
  width: number;
  height: number;
  sizeMismatch: boolean;  // baseline and current differ in dimensions
};

function loadImageData(base64: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) { reject(new Error("no 2d context")); return; }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => reject(new Error("could not decode screenshot"));
    img.src = `data:image/png;base64,${base64}`;
  });
}

/** Per-pixel change test — squared RGBA distance beyond a tolerance, each image
 *  indexed at its own offset (row strides differ when widths differ). `tol` is
 *  0..1 (0 = strict, higher = more forgiving of anti-aliasing/compression). */
function changed(a: Uint8ClampedArray, ai: number, b: Uint8ClampedArray, bi: number, tol: number): boolean {
  const dr = a[ai] - b[bi], dg = a[ai + 1] - b[bi + 1], db = a[ai + 2] - b[bi + 2], da = a[ai + 3] - b[bi + 3];
  const dist = dr * dr + dg * dg + db * db + da * da;
  const max = 4 * 255 * 255;
  return dist / max > tol * tol;
}

export async function diffImages(
  baselinePng: string,
  currentPng: string,
  threshold = 0.1,
): Promise<DiffResult> {
  const [base, cur] = await Promise.all([loadImageData(baselinePng), loadImageData(currentPng)]);

  const width = Math.min(base.width, cur.width);
  const height = Math.min(base.height, cur.height);
  const sizeMismatch = base.width !== cur.width || base.height !== cur.height;

  const out = document.createElement("canvas");
  out.width = width; out.height = height;
  const ctx = out.getContext("2d")!;
  const diff = ctx.createImageData(width, height);

  let changedPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bi = (y * base.width + x) * 4;
      const ci = (y * cur.width + x) * 4;
      const di = (y * width + x) * 4;
      // Current pixel, dimmed, so red highlights stand out.
      diff.data[di] = 60 + cur.data[ci] * 0.35;
      diff.data[di + 1] = 60 + cur.data[ci + 1] * 0.35;
      diff.data[di + 2] = 60 + cur.data[ci + 2] * 0.35;
      diff.data[di + 3] = 255;
      if (changed(base.data, bi, cur.data, ci, threshold)) {
        diff.data[di] = 255; diff.data[di + 1] = 40; diff.data[di + 2] = 40;
        changedPixels++;
      }
    }
  }
  ctx.putImageData(diff, 0, 0);

  const total = width * height;
  return {
    percent: total ? (changedPixels / total) * 100 : 0,
    changed: changedPixels,
    total,
    diffDataUrl: out.toDataURL("image/png"),
    width,
    height,
    sizeMismatch,
  };
}
