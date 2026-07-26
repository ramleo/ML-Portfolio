"use client";

import { useEffect, useRef, useState } from "react";
import { splitForHighlight, textMatches, wordsMatch } from "./wordMatch";

export type SearchableItem = { key: string | number; prefix?: string; text: string };

/** Renders `text` with every word that matches `query` (see wordMatch.ts —
 * prefix + stemmer + irregular-plural hybrid) wrapped in <mark>. */
function highlightMatches(text: string, query: string, accent: string) {
  if (!query.trim()) return text;
  const parts = splitForHighlight(text);
  return parts.map((part, i) =>
    i % 2 === 1 && wordsMatch(part, query)
      ? <mark key={i} style={{ background: accent, color: "#0b0b12", fontWeight: 700, borderRadius: 3, padding: "0 2px" }}>{part}</mark>
      : part
  );
}

type Props = {
  items: SearchableItem[];
  accent: string;
  placeholder: string;
  highlightedKey?: string | number | null;
  onSelect?: (key: string | number) => void;
  itemRef?: (key: string | number, el: HTMLParagraphElement | null) => void;
};

/** Live search-as-you-type over a list of text items — used for both a
 * video's transcript segments and a PDF/CSV/image document's extracted
 * text (see DocumentSummaryPanel). Single shared implementation (SRP/DRY)
 * so both surfaces get the same prefix-match behavior and up/down match
 * navigation rather than two near-identical copies. */
export default function SearchableTextPanel({ items, accent, placeholder, highlightedKey, onSelect, itemRef }: Props) {
  const [query, setQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const refs = useRef<Map<string | number, HTMLParagraphElement | null>>(new Map());

  const matchKeys = query.trim() ? items.filter(it => textMatches(it.text, query)).map(it => it.key) : [];

  useEffect(() => { setMatchCursor(0); }, [query]);
  useEffect(() => {
    if (matchKeys.length === 0) return;
    const key = matchKeys[matchCursor % matchKeys.length];
    refs.current.get(key)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchCursor, query]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-[9px] px-2 py-1 rounded border bg-transparent outline-none"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
        />
        {query.trim() && (
          <>
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {matchKeys.length ? `${(matchCursor % matchKeys.length) + 1}/${matchKeys.length}` : "0"}
            </span>
            <button onClick={() => setMatchCursor(c => c - 1)} disabled={!matchKeys.length}
              className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              ↑
            </button>
            <button onClick={() => setMatchCursor(c => c + 1)} disabled={!matchKeys.length}
              className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
              ↓
            </button>
          </>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto p-2 rounded-lg min-h-0"
        style={{ background: "rgba(255,255,255,0.02)", maxHeight: 160 }}>
        {items.map(it => {
          const isCurrentMatch = matchKeys.length > 0 && matchKeys[matchCursor % matchKeys.length] === it.key;
          return (
            <p key={it.key}
              ref={el => { refs.current.set(it.key, el); itemRef?.(it.key, el); }}
              onClick={onSelect ? () => onSelect(it.key) : undefined}
              className="text-[10px] leading-relaxed rounded px-1 -mx-1 transition-colors"
              style={{
                color: "rgba(255,255,255,0.6)",
                background: isCurrentMatch ? `${accent}33` : highlightedKey === it.key ? `${accent}22` : "transparent",
                cursor: onSelect ? "pointer" : "default",
              }}>
              {it.prefix && <span style={{ color: `${accent}99` }}>{it.prefix}</span>}
              {highlightMatches(it.text, query, accent)}
            </p>
          );
        })}
      </div>
    </div>
  );
}