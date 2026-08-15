// Only used when a tool page's ToolChatContext.onGenerateImage is set
// (opt-in — Text-to-Image today). Requires an explicit generation verb near
// the start of the message so ordinary tool-help questions ("how do style
// presets work", "why is my image blurry") never get misrouted — those
// don't start with a generate verb.
const IMAGE_VERB = "(?:generate|create|draw|make|paint|render)";
const IMAGE_NOUN = "(?:image|picture|photo|artwork|art|illustration|drawing)";
const POLITE = "(?:please\\s+|can you\\s+|could you\\s+|would you\\s+)?";
const IMAGE_WITH_NOUN_RE = new RegExp(
  `^${POLITE}${IMAGE_VERB}\\s+(?:me\\s+)?(?:an?\\s+)?${IMAGE_NOUN}\\s*(?:of|showing|depicting|for)?\\s*[:\\-]?\\s*(.+)$`, "i"
);
const IMAGE_BARE_RE = new RegExp(`^${POLITE}${IMAGE_VERB}\\s+(?:me\\s+)?(?:an?\\s+)?(.+)$`, "i");

/** Extracts the image description from a chat message that reads as an
 * explicit generation request ("generate an image of X", "draw me X"),
 * or null if the message doesn't match that pattern (a question, a normal
 * sentence, etc.) — callers only intercept the normal chat pipeline on a
 * non-null result. */
export function extractImagePrompt(text: string): string | null {
  const trimmed = text.trim();
  const withNoun = trimmed.match(IMAGE_WITH_NOUN_RE);
  if (withNoun?.[1]?.trim()) return withNoun[1].trim();
  const bare = trimmed.match(IMAGE_BARE_RE);
  if (bare?.[1]?.trim() && bare[1].trim().length >= 3) return bare[1].trim();
  return null;
}

// A "compare styles" request ("compare anime vs photorealistic style of a
// cat", "generate 2 different styles of a mountain") doesn't start with a
// generate verb, so extractImagePrompt alone would miss it — this widens
// the interception trigger without knowing anything about WHICH styles
// exist (that's tool-specific, kept out of this generic file; see
// text-to-image/chatCompareIntent.ts for the actual style parsing).
const COMPARE_TRIGGER_RE = /\b(compare|vs\.?|versus)\b/i;
const STYLE_COUNT_RE = /\b\d+\s+(?:different\s+)?styles?\b/i;

/** Whether a chat message should be intercepted as an image request at all
 * (single generate OR a styles comparison) — the boolean gate used before
 * calling ToolChatContext.onGenerateImage. The actual prompt/style
 * extraction happens downstream (in the page's onGenerateImage callback),
 * since a comparison needs tool-specific style-name knowledge this file
 * deliberately doesn't have. */
export function isImageGenerationIntent(text: string): boolean {
  return extractImagePrompt(text) !== null || COMPARE_TRIGGER_RE.test(text) || STYLE_COUNT_RE.test(text);
}