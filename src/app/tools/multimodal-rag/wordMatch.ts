import { stemmer } from "stemmer";

/**
 * Word-matching for the live document/transcript search box (SearchableTextPanel).
 *
 * DESIGN NOTE FOR FUTURE SESSIONS — read before "improving" this file:
 *
 * A search for "child" is expected to match "children" (and vice versa).
 * We evaluated three options (2026-07-26) before landing here:
 *
 *   1. Plain prefix match ("child" matches anything STARTING WITH "child").
 *      Cheap, zero dependencies, handles regular suffixes fine (child ->
 *      children, childish) but doesn't catch irregular forms where the
 *      match isn't a simple prefix (man -> men, mouse -> mice), and can't
 *      catch a word buried in a compound (child -> grandchildren).
 *
 *   2. A real stemmer (Porter/Snowball, e.g. the `stemmer` npm package —
 *      2KB, zero deps). Verified directly: stemmer("child") = "child" but
 *      stemmer("children") = "children" — DIFFERENT STEMS. Stemmers only
 *      strip regular suffix PATTERNS (running -> run, cats -> cat); they
 *      have no dictionary, so they cannot fix irregular plurals at all.
 *      Using a stemmer ALONE would have been a regression vs. prefix match
 *      for the exact case that motivated this feature.
 *
 *   3. A full dictionary-based lemmatizer (e.g. wink-lemmatizer). This
 *      DOES correctly unify child/children, man/men, etc. Checked its real
 *      cost via `npm view`: wink-lemmatizer's own code is 36KB, but its
 *      dependency wink-lexicon (the actual word-form dictionary) is
 *      12.5 MB unpacked. Disproportionate to ship for a search box on one
 *      document. (`natural`, a bigger NLP package, is 13.7MB and pulls in
 *      unrelated server-only deps like mongoose/redis/pg — not usable
 *      client-side at all.)
 *
 * CHOSEN: a hybrid of (1) prefix match + (2) the tiny `stemmer` package +
 * a short hand-maintained list of common English irregular plurals below.
 * This covers regular suffixes AND the handful of irregular forms anyone
 * is actually likely to type, for a few hundred bytes total — instead of
 * a 12.5MB dictionary.
 *
 * TO UPGRADE LATER (e.g. if this feature gets much heavier real-world use
 * and the irregular-plural list stops being enough): everything here is
 * intentionally funneled through the single `wordsMatch()` function below.
 * Swapping in a real lemmatizer means rewriting the body of that one
 * function — nothing in SearchableTextPanel.tsx needs to change.
 */

// Common English irregular plurals not caught by suffix-stripping. Not
// exhaustive by design — covers the words someone would plausibly type,
// not an attempt at a full dictionary (that's option 3 above).
const IRREGULAR_PAIRS: [string, string][] = [
  ["children", "child"], ["men", "man"], ["women", "woman"], ["mice", "mouse"],
  ["feet", "foot"], ["teeth", "tooth"], ["people", "person"], ["geese", "goose"],
  ["oxen", "ox"], ["lice", "louse"], ["cacti", "cactus"], ["dice", "die"],
];

const IRREGULAR_CANON: Record<string, string> = {};
for (const [plural, singular] of IRREGULAR_PAIRS) {
  IRREGULAR_CANON[plural] = singular;
  IRREGULAR_CANON[singular] = singular;
}

function canonicalForm(wordLower: string): string {
  return IRREGULAR_CANON[wordLower] ?? stemmer(wordLower);
}

/** True if `word` (as found in a document) should count as a match for
 * `query` (what the user typed) — prefix match first (cheap, catches most
 * real cases directly), falling back to canonical-form comparison (stemmer
 * + irregular-plural override) for everything else. */
export function wordsMatch(word: string, query: string): boolean {
  const w = word.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return false;
  if (w.startsWith(q)) return true;
  return canonicalForm(w) === canonicalForm(q);
}

/** True if any word in `text` matches `query`. */
export function textMatches(text: string, query: string): boolean {
  if (!query.trim()) return false;
  const words = text.match(/\w+/g);
  if (!words) return false;
  return words.some(w => wordsMatch(w, query));
}

/** Splits `text` into alternating (non-word, word, non-word, word, ...)
 * pieces so a caller can render matching words differently (e.g. <mark>)
 * without losing punctuation/whitespace. */
export function splitForHighlight(text: string): string[] {
  return text.split(/(\w+)/);
}