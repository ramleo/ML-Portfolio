/** Static option lists for the Text-to-Image tool.
 *
 * Extracted from useTextToImageRunner.ts when instrumenting its three Gemini
 * calls pushed that file past the 400-line limit. Pure data with no behaviour,
 * so it is the cleanest thing to lift out — the hook keeps all of the logic.
 */

export const STYLE_OPTIONS: { key: string; label: string }[] = [
  { key: "photorealistic", label: "Photorealistic" },
  { key: "watercolor", label: "Watercolor" },
  { key: "anime", label: "Anime" },
  { key: "cyberpunk", label: "Cyberpunk" },
  { key: "oil-painting", label: "Oil Painting" },
  { key: "3d-render", label: "3D Render" },
  { key: "sketch", label: "Sketch" },
];

export const ASPECT_RATIO_OPTIONS: { key: string; label: string }[] = [
  { key: "square", label: "Square" },
  { key: "landscape", label: "Landscape" },
  { key: "portrait", label: "Portrait" },
];

export const VARIATION_COUNTS = [1, 2, 4] as const;
export type VariationCount = (typeof VARIATION_COUNTS)[number];
