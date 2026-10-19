/** Export the chosen crop area of an image as a square JPEG blob, for avatar
 * upload. `area` is react-easy-crop's pixel crop ({ x, y, width, height }). The
 * result is downscaled to `size`×`size` so stored avatars stay small. */
export interface PixelArea { x: number; y: number; width: number; height: number }

export async function cropToBlob(src: string, area: PixelArea, size = 320): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height, // source rect (the crop)
    0, 0, size, size,                         // dest rect (square)
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
