// Shared canvas-based image re-encoding — entirely client-side, no extra API
// call. Used both for download format conversion and for guaranteeing PNG
// bytes before sending an image to a backend edit endpoint (mm-deblur/
// mm-ai-fill assume PNG input; Gemini's own text-to-image call was observed
// to return JPEG for pure generation, see mm_text_to_image.py).
export function convertImageDataUri(dataUri: string, targetMime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      // JPEG/WebP have no alpha channel — flatten onto white first so a
      // transparent source doesn't silently turn black.
      if (targetMime !== "image/png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL(targetMime, 0.92));
    };
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = dataUri;
  });
}

/** Returns bare base64 (no `data:...;base64,` prefix) guaranteed to be real
 * PNG bytes, re-encoding via canvas if the source wasn't already PNG. */
export async function toPngBase64(image: string, mimeType: string): Promise<string> {
  if (mimeType === "image/png") return image;
  const pngUri = await convertImageDataUri(`data:${mimeType};base64,${image}`, "image/png");
  return pngUri.split(",")[1] ?? pngUri;
}