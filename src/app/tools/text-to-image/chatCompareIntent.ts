import { STYLE_OPTIONS } from "./useTextToImageRunner";
import { extractImagePrompt } from "@/components/chatImageIntent";

export interface ComparisonRequest {
  prompt: string;
  styleKeys: string[];
}

// Longest labels first so "oil painting" matches before a shorter label
// that happens to be a substring of it.
const STYLE_BY_LABEL = [...STYLE_OPTIONS].sort((a, b) => b.label.length - a.label.length);
const COUNT_RE = /\b(\d+)\s+(?:different\s+)?styles?\b/i;
const COMPARE_WORD_RE = /\b(compare|vs\.?|versus)\b/i;

function findNamedStyles(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const opt of STYLE_BY_LABEL) {
    if (lower.includes(opt.label.toLowerCase()) && !found.includes(opt.key)) found.push(opt.key);
  }
  return found;
}

// Best-effort subject extraction for a comparison message — strips the
// leading directive verb, any style names/count phrases, and connector
// words, leaving (hopefully) just the subject. Regex-based intent parsing,
// not real NLU, same caveat as chatImageIntent.ts's extractImagePrompt:
// designed to catch common phrasings, not every possible one. Falls back to
// extractImagePrompt's own extraction (which requires a leading generate
// verb) when this heuristic strips the message down to nothing usable.
function extractSubject(text: string, styleKeys: string[]): string {
  let s = text.trim();
  s = s.replace(/^(?:please\s+|can you\s+|could you\s+|would you\s+)?(?:compare|generate|create|make|draw|paint|render|show me)\s+/i, "");
  s = s.replace(COUNT_RE, " ");
  s = s.replace(/\bdifferent\s+styles?\b/gi, " ").replace(/\bstyles?\b/gi, " ");
  for (const key of styleKeys) {
    const opt = STYLE_OPTIONS.find(o => o.key === key);
    if (opt) s = s.replace(new RegExp(`\\b${opt.label}\\b`, "ig"), " ");
  }
  s = s.replace(/\b(vs\.?|versus|and|of|for|in|as)\b/gi, " ");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

/** Detects a chat request to compare 2+ styles of the same subject in one
 * go — e.g. "compare anime vs photorealistic style of a cat" (named styles)
 * or "compare 2 different styles of a mountain" (no names — defaults to the
 * first N entries in STYLE_OPTIONS). Returns null for anything that isn't
 * clearly a comparison request, so a plain single-image chat request keeps
 * going through the normal extractImagePrompt path unaffected. */
export function extractStyleComparison(text: string): ComparisonRequest | null {
  const named = findNamedStyles(text);
  const countMatch = text.match(COUNT_RE);
  const hasTrigger = COMPARE_WORD_RE.test(text) || !!countMatch;
  if (!hasTrigger) return null;

  let styleKeys: string[];
  if (named.length >= 2) {
    styleKeys = named.slice(0, 4);
  } else if (countMatch) {
    const n = Math.min(4, Math.max(2, parseInt(countMatch[1], 10) || 2));
    styleKeys = STYLE_OPTIONS.slice(0, n).map(s => s.key);
  } else {
    styleKeys = STYLE_OPTIONS.slice(0, 2).map(s => s.key);
  }

  const subject = extractSubject(text, styleKeys) || extractImagePrompt(text) || "";
  if (subject.length < 3) return null;
  return { prompt: subject, styleKeys };
}