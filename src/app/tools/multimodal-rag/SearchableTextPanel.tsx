"use client";

import { useEffect, useRef, useState } from "react";

export type SearchableItem = { key: string | number; prefix?: string; text: string };

/** Escapes regex metacharacters in a raw search string. */
function escapeRegex(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary PREFIX match — "child" matches "child", "children",
 * "childish", but not "grandchild" (boundary) or unrelated words. Plain
 * substring search would also match "child" inside "wildchild"; prefix
 * matching is closer to what a typed search word actually means here. */
function buildPrefixPattern(query: string): string | null {
  const q = query.trim();
  return q ? `\\b${escapeRegex(q)}\\w*` : null;
}

function highlightMatches(text: string, pattern: string | null, accent: string) {
  if (!pattern) return text;
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: `${accent}55`, color: "inherit", borderRadius: 2 }}>{part}</mark>
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

  const pattern = buildPrefixPattern(query);
  const testRe = pattern ? new RegExp(pattern, "i") : null;
  const matchKeys = testRe ? items.filter(it => testRe.test(it.text)).map(it => it.key) : [];

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
              {highlightMatches(it.text, pattern, accent)}
            </p>
          );
        })}
      </div>
    </div>
  );
}