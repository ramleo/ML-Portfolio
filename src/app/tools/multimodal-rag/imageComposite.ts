import type { Bbox } from "./_types";

/** Loads a base64 image (no data-URI prefix) into an <img>, decoded and
 * ready to draw — canvas drawImage needs a fully-loaded element, not just a
 * src assignment. */
function loadImage(b64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/png;base64,${b64}`;
  });
}

/** Draws `baseB64` onto a canvas sized to its own true pixel dimensions,
 * converts `bbox` (normalized 0-1, page-relative — same convention every
 * bbox in this file uses) to a pixel rect, hands it to `draw` to paint
 * whatever goes in that rect (text or a pasted image), and returns the
 * composited result as a base64 PNG (no data-URI prefix, matching every
 * other image string in this app). Shared by useInpaint's addText and
 * addImage — the only difference between them is what `draw` does. */
export async function compositeOntoImage(
  baseB64: string,
  bbox: Bbox,
  draw: (ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }) => void,
): Promise<string> {
  const img = await loadImage(baseB64);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const [bx, by, bw, bh] = bbox;
  draw(ctx, { x: bx * canvas.width, y: by * canvas.height, w: bw * canvas.width, h: bh * canvas.height });

  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

/** Reads a File (from an <input type="file">) as a decoded <img>, for the
 * "paste an image" fill path. */
export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Triggers a browser download of a base64 PNG (no data-URI prefix) — used
 * to save the Object Remover's edited image back to the user's device. A
 * plain <a download> click needs no library and works entirely client-side,
 * same as every other edit in this feature. */
export function downloadBase64Image(b64: string, filename: string): void {
  const a = document.createElement("a");
  a.href = `data:image/png;base64,${b64}`;
  a.download = filename;
  a.click();
}