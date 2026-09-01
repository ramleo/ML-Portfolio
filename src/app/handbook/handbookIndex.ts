import { wordsMatch, type MatchOptions } from "@/lib/search/wordMatch";

/**
 * Find-in-page for the handbook, built over the DOM the server already sent.
 *
 * The whole book — 50 chapters — is server-rendered into `.hb-body`, so
 * searching it needs no index shipped alongside the page. A build-time JSON
 * index would mean downloading the same 17,000 lines a second time.
 *
 * Matches come back as `Range`s rather than as markup, and the caller paints
 * them with the CSS Custom Highlight API. That is not a stylistic preference:
 * HandbookActions feeds `.hb-body`'s innerHTML straight to Paged.js when the
 * reader asks for the PDF, so any <mark> element injected here would be
 * typeset into their book.
 */

export type ChapterRef = {
  /** The heading's id, so a result can be linked to. Empty for front matter. */
  id: string;
  /** "Chapter 34", "Part 1", or "" — whatever the heading labels itself. */
  num: string;
  title: string;
};

type WordEntry = {
  node: Text;
  start: number;
  end: number;
  word: string;
  chapter: ChapterRef;
};

export type Match = { range: Range; chapter: ChapterRef };

export type ChapterHits = { chapter: ChapterRef; count: number; first: number };

const FRONT_MATTER: ChapterRef = { id: "", num: "", title: "Front matter" };
const CONTENTS: ChapterRef = { id: "contents", num: "", title: "Contents" };

/** Words a reader types between two real terms that the book may not print.
 * "Security and Trust" has to find the part titled "Security & Trust" — the
 * ampersand is not a word so it never reaches the index at all, leaving the
 * typed "and" with nothing to match. */
const SKIPPABLE = new Set(["and", "or"]);

/** The handbook searches loosely on purpose: a reader recalls half a term and
 * types the middle of it. See MatchOptions in wordMatch.ts. */
const MATCH: MatchOptions = { substring: true };

/** Reads a chapter heading's own label off it: the generator puts the number
 * in a `.bk-chnum` span and leaves the title as the heading's other text. */
function headingRef(el: Element): ChapterRef {
  // A part page splits its name across two headings — "Part 4" in the h1 and
  // "Security & Trust" in the h2 — so reading the h1 alone labels the group
  // "Part 4" and tells the reader nothing about what is in it.
  const part = el.closest(".bk-partpage");
  if (part) return { id: part.id, num: el.textContent?.trim() ?? "", title: part.querySelector("h2")?.textContent?.trim() ?? "" };
  const num = el.querySelector(".bk-chnum")?.textContent?.trim() ?? "";
  const full = el.textContent?.trim() ?? "";
  return { id: el.id, num, title: full.slice(num.length).trim() || full };
}

function tokenize(text: string): { word: string; start: number }[] {
  const out: { word: string; start: number }[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    out.push({ word: m[0], start: m.index });
  }
  return out;
}

let cached: WordEntry[] | null = null;

/**
 * Every word in the book, in document order, tagged with the chapter it sits
 * under. Built once — the content is static for the life of the page.
 *
 * The contents list is indexed too, under its own "Contents" heading. It was
 * left out at first on the grounds that it only repeats the 50 chapter titles
 * — which missed the point: the contents is where a reader searching for a
 * chapter *wants* to land, and a hit there is a navigation result, not a
 * duplicate. Labelling it keeps it distinguishable from a hit in the prose.
 */
export function buildIndex(root: HTMLElement): WordEntry[] {
  if (cached) return cached;
  const entries: WordEntry[] = [];
  let chapter = FRONT_MATTER;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // The title page is present but display:none, so its words are not on
      // screen and must not be findable.
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).closest(".bk-titlepage"))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.matches(".bk-toc")) chapter = CONTENTS;
      else if (el.matches("h1.bk-chapter, .bk-partpage h1")) chapter = headingRef(el);
      continue;
    }
    const text = node as Text;
    if (!text.data.trim()) continue;
    for (const { word, start } of tokenize(text.data)) {
      entries.push({ node: text, start, end: start + word.length, word, chapter });
    }
  }

  cached = entries;
  return entries;
}

/**
 * Matches for `query`, in document order.
 *
 * A multi-word query has to match consecutive words *within one text node*.
 * Allowing it to run across nodes would let a phrase match the end of one
 * paragraph and the start of the next, and highlight everything between —
 * a hit the reader would rightly call wrong.
 *
 * A typed "and" or "or" may be absent from the text (the book writes "&"), so
 * those terms are allowed to match nothing and are skipped over.
 */
export function findMatches(entries: WordEntry[], query: string): Match[] {
  const terms = tokenize(query).map(t => t.word.toLowerCase());
  if (!terms.length) return [];
  // A lone "and" is a real search for the word; between other terms it is glue.
  const required = terms.length > 1 ? terms.filter(t => !SKIPPABLE.has(t)) : terms;
  if (!required.length) return [];
  const out: Match[] = [];

  for (let i = 0; i < entries.length; i++) {
    const node = entries[i].node;
    let at = i;
    let ok = true;
    for (const term of required) {
      // Step over an "and"/"&" the book chose not to spell out.
      while (at < entries.length && entries[at].node === node && at > i && SKIPPABLE.has(entries[at].word.toLowerCase()) && !wordsMatch(entries[at].word, term, MATCH))
        at++;
      if (at >= entries.length || entries[at].node !== node || !wordsMatch(entries[at].word, term, MATCH)) { ok = false; break; }
      at++;
    }
    if (!ok) continue;
    const first = entries[i];
    const last = entries[at - 1];
    const range = document.createRange();
    range.setStart(first.node, first.start);
    range.setEnd(last.node, last.end);
    out.push({ range, chapter: first.chapter });
    i = at - 1;
  }
  return out;
}

/** The same matches grouped by chapter, so the reader can see *where* the
 * hits are — the one thing the browser's own find bar cannot tell them. */
export function groupByChapter(matches: Match[]): ChapterHits[] {
  const groups: ChapterHits[] = [];
  matches.forEach((m, i) => {
    const last = groups[groups.length - 1];
    if (last && last.chapter.id === m.chapter.id) last.count++;
    else groups.push({ chapter: m.chapter, count: 1, first: i });
  });
  return groups;
}
