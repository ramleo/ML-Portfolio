import type { Capability } from "@/data/capabilities";

/**
 * Search and faceting for the toolkit grid.
 *
 * The previous matcher was `title.toLowerCase().startsWith(query)` and nothing
 * else. Measured live against the real 50-card data, that meant "malware",
 * "scanner", "detector" and "security" all returned zero results — every one of
 * those words appears in the data, just never as the first word of a title. The
 * code comment defending it was right about the failure it was avoiding (a bare
 * `includes` over the description lights up almost every card on one common
 * letter) but wrong about the fix: the answer is ranking, not a narrower field.
 *
 * So: match across title, tags, subtitle and description, score each field
 * differently, and sort by score. The single-letter problem is handled by
 * DEEP_MATCH_MIN_LENGTH — one- and two-character queries only match at the
 * start of a word in a title or tag, which preserves the "type P" behaviour the
 * placeholder promises, while "malware" reaches the description.
 */

/** Below this length a term only matches word-starts, never a substring. */
const DEEP_MATCH_MIN_LENGTH = 3;

/** Relative weights. Only the ordering matters, not the absolute values. */
const SCORE = {
  titleExact: 1000,
  titlePrefix: 500,
  titleWordPrefix: 300,
  tagExact: 260,
  tagWordPrefix: 200,
  titleContains: 150,
  tagContains: 100,
  subtitleContains: 60,
  descriptionContains: 20,
} as const;

/** True if any whitespace/punctuation-delimited word in `haystack` starts with `term`. */
function hasWordStartingWith(haystack: string, term: string): boolean {
  return haystack.split(/[^a-z0-9]+/).some((word) => word.startsWith(term));
}

/** Best single score for one search term against one tool. 0 means no match. */
function scoreTerm(cap: Capability, term: string): number {
  const title = cap.title.toLowerCase();
  let best = 0;
  const bump = (n: number) => { if (n > best) best = n; };

  if (title === term) bump(SCORE.titleExact);
  else if (title.startsWith(term)) bump(SCORE.titlePrefix);
  else if (hasWordStartingWith(title, term)) bump(SCORE.titleWordPrefix);

  for (const tag of cap.tags) {
    const t = tag.toLowerCase();
    if (t === term) bump(SCORE.tagExact);
    else if (hasWordStartingWith(t, term)) bump(SCORE.tagWordPrefix);
  }

  if (term.length >= DEEP_MATCH_MIN_LENGTH) {
    if (title.includes(term)) bump(SCORE.titleContains);
    if (cap.tags.some((t) => t.toLowerCase().includes(term))) bump(SCORE.tagContains);
    if (cap.subtitle.toLowerCase().includes(term)) bump(SCORE.subtitleContains);
    if (cap.description.toLowerCase().includes(term)) bump(SCORE.descriptionContains);
  }

  return best;
}

/**
 * Relevance of a tool to a whole query. Terms are ANDed — every word typed has
 * to hit something — so "pdf malware" narrows rather than widens. An empty
 * query scores 1 so callers can treat "> 0" as the single visibility test.
 */
export function scoreCapability(cap: Capability, query: string): number {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  let total = 0;
  for (const term of terms) {
    const termScore = scoreTerm(cap, term);
    if (termScore === 0) return 0;
    total += termScore;
  }
  return total;
}

/** A tag has to be shared by at least this many tools to earn a filter chip. */
const MIN_TAG_USES = 3;

/**
 * Filter chips, derived from the tags already in the data rather than a second
 * hand-maintained list. Two rules keep the row short and useful: a tag needs
 * MIN_TAG_USES tools behind it (the vocabulary is long-tailed — most tags are
 * used exactly once, and a chip that filters to a single card is just a worse
 * way to click that card), and any tag already expressed by the domain buttons
 * above is dropped, since "Computer Vision" and "Security" would otherwise
 * appear twice in a row doing the same job.
 *
 * What survives is the cross-cutting axis the domain buttons cannot express —
 * where the work happens and what powers it (Local Compute, Client-Side, LLM,
 * RAG, Privacy) — which is the question a visitor asked to upload a file
 * actually has.
 */
export function deriveFilterTags(caps: Capability[], domains: string[]): string[] {
  const domainText = domains.map((d) => d.toLowerCase());
  const counts = new Map<string, number>();

  for (const cap of caps) {
    for (const tag of new Set(cap.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([tag, n]) => n >= MIN_TAG_USES && !domainText.some((d) => d.includes(tag.toLowerCase())))
    .sort(([tagA, a], [tagB, b]) => b - a || tagA.localeCompare(tagB))
    .map(([tag]) => tag);
}

export function hasTag(cap: Capability, tag: string): boolean {
  return cap.tags.includes(tag);
}
