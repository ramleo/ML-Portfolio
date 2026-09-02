"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildIndex, findMatches, groupByChapter, type ChapterHits, type Match } from "./handbookIndex";
import { markJump } from "./handbookJump";

/**
 * A find bar for the handbook.
 *
 * The browser already has one, so this exists to do the thing the browser's
 * cannot: say *where* in a fifty-chapter book the hits are. Matches are
 * counted per chapter and listed, so a search for "entropy" reads as three
 * chapters rather than as nineteen anonymous stops on a scrollbar.
 *
 * Highlighting goes through the CSS Custom Highlight API, which paints Ranges
 * without putting anything in the DOM — see handbookIndex.ts for why that is a
 * requirement here and not a preference.
 */

type HL = { new (...ranges: Range[]): unknown };
type Painter = { Ctor: HL; registry: Map<string, unknown> };

/** Resolved on use, not at module scope: this page is prerendered, and there
 * is no `CSS` global on the server to read `highlights` off. */
function painter(): Painter | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as unknown as { Highlight?: HL }).Highlight;
  const registry = (window.CSS as unknown as { highlights?: Map<string, unknown> } | undefined)?.highlights;
  return Ctor && registry ? { Ctor, registry } : null;
}

function paint(all: Match[], current: number) {
  const p = painter();
  if (!p) return;
  p.registry.delete("hb-hit");
  p.registry.delete("hb-hit-current");
  const others = all.filter((_, i) => i !== current).map(m => m.range);
  if (others.length) p.registry.set("hb-hit", new p.Ctor(...others));
  if (all[current]) p.registry.set("hb-hit-current", new p.Ctor(all[current].range));
}

function clearPaint() {
  const p = painter();
  if (!p) return;
  p.registry.delete("hb-hit");
  p.registry.delete("hb-hit-current");
}

/** Centres a match without letting the sticky bar sit on top of it. */
function reveal(match: Match) {
  const rect = match.range.getBoundingClientRect();
  window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.38, behavior: "smooth" });
  if (painter()) return;
  // No Custom Highlight API: flash the containing block so the reader can at
  // least see which paragraph was landed on.
  const el = match.range.startContainer.parentElement;
  if (!el) return;
  el.classList.add("hb-hit-flash");
  window.setTimeout(() => el.classList.remove("hb-hit-flash"), 1600);
}

export default function HandbookSearch() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<ChapterHits[]>([]);
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // The server has no idea which keyboard the reader has, so it renders no
  // hint at all and the client fills one in — an explicit server snapshot
  // rather than a guess that would mismatch on hydration. It never changes
  // after that, hence the no-op subscribe.
  const modKey = useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "\u2318" : "Ctrl"),
    () => ""
  );

  /**
   * Undo history for the query, kept by hand.
   *
   * The field is a controlled input, so React reassigns `value` on every
   * keystroke — and a programmatic assignment throws away the browser's own
   * undo stack for that field. Cmd-Z therefore does nothing, and clearing the
   * bar means retyping from scratch. This is that stack, put back.
   */
  const past = useRef<string[]>([""]);
  const step = useRef(0);
  const replaying = useRef(false);

  const commit = useCallback((value: string) => {
    // An undo is not itself an edit; recording it would make Cmd-Z a no-op
    // that toggles between the same two entries.
    if (replaying.current) { replaying.current = false; return; }
    if (past.current[step.current] === value) return;
    past.current = [...past.current.slice(0, step.current + 1), value].slice(-50);
    step.current = past.current.length - 1;
  }, []);

  const travel = useCallback((delta: number) => {
    const next = step.current + delta;
    if (next < 0 || next >= past.current.length) return;
    step.current = next;
    replaying.current = true;
    setQuery(past.current[next]);
    input.current?.focus();
  }, []);

  // Debounced: the index walk is cheap after the first call, but re-scanning
  // 17,000 lines of words on every keystroke of a long word is not. The same
  // pause is what an undo step is snapped to, so one undo takes back a burst
  // of typing rather than a single character.
  useEffect(() => {
    const t = window.setTimeout(() => {
      commit(query);
      const root = document.querySelector<HTMLElement>(".hb-body");
      if (!root || query.trim().length < 2) {
        setMatches([]);
        setGroups([]);
        clearPaint();
        return;
      }
      const found = findMatches(buildIndex(root), query);
      setMatches(found);
      setGroups(groupByChapter(found));
      setAt(0);
      paint(found, 0);
    }, 150);
    return () => window.clearTimeout(t);
  }, [query, commit]);

  useEffect(() => () => clearPaint(), []);

  const go = useCallback(
    (index: number) => {
      if (!matches.length) return;
      // Once for the whole walk, not once per hit: the query names the
      // navigation, so Enter-Enter-Enter through one search keeps pointing
      // back at where reading stopped — while searching for something else
      // is a new trip and takes a fresh mark.
      markJump(`find:${query}`);
      const next = (index + matches.length) % matches.length;
      setAt(next);
      paint(matches, next);
      reveal(matches[next]);
    },
    [matches, query]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Back to an empty bar: Escape and the clear button do the same thing, and
   * focus stays in the field so the next query can just be typed. */
  const clear = () => {
    setQuery("");
    setOpen(false);
    clearPaint();
    input.current?.focus();
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); go(e.shiftKey ? at - 1 : at + 1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); go(at + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); go(at - 1); }
    else if (e.key === "Escape") { clear(); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      travel(e.shiftKey ? 1 : -1);
    } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
      e.preventDefault();
      travel(1);
    }
  };

  const chapters = groups.length;
  const summary = !query.trim()
    ? ""
    : query.trim().length < 2
    ? "Keep typing…"
    : matches.length === 0
    ? "No matches"
    : `${at + 1} of ${matches.length} · ${chapters} chapter${chapters === 1 ? "" : "s"}`;

  return (
    <div className="hb-search">
      <div className="hb-search-bar">
        <svg className="hb-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search the handbook…"
          aria-label="Search the handbook"
          className="hb-search-input"
        />
        {/* Only worth showing while the field is empty — once there is a query
            the count and the controls need the room, and anyone who is typing
            has already found the box. */}
        {!query && modKey && (
          <kbd className="hb-search-kbd" aria-hidden="true">
            {modKey}
            <span>K</span>
          </kbd>
        )}
        {summary && <span className="hb-search-count">{summary}</span>}
        {query && (
          <button onClick={clear} className="hb-search-step hb-search-clear" aria-label="Clear the search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button onClick={() => go(at - 1)} disabled={!matches.length} className="hb-search-step" aria-label="Previous match">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button onClick={() => go(at + 1)} disabled={!matches.length} className="hb-search-step" aria-label="Next match">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {groups.length > 0 && (
          <button onClick={() => setOpen(v => !v)} className="hb-search-step hb-search-toggle" aria-expanded={open}>
            {open ? "Hide" : "Where"}
          </button>
        )}
      </div>
      {open && groups.length > 0 && (
        <ul className="hb-search-groups">
          {groups.map(g => (
            <li key={`${g.chapter.id}-${g.first}`}>
              <button onClick={() => go(g.first)} className="hb-search-group">
                <span className="hb-search-group-name">
                  {g.chapter.num && <em>{g.chapter.num} · </em>}
                  {g.chapter.title}
                </span>
                <span className="hb-search-group-count">{g.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
