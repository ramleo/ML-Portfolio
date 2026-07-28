"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MM_RAG_GUIDE } from "./userGuide";
import { textMatches } from "./wordMatch";

const ACCENT = "#a78bfa";

const MD = {
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 className="text-lg font-bold mb-4" style={{ color: ACCENT }}>{children}</h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 className="text-[13px] font-bold uppercase tracking-wide mt-6 mb-2"
      style={{ color: `${ACCENT}cc` }}>{children}</h2>
  ),
  p: ({ children }: React.PropsWithChildren) => (
    <p className="text-[12px] leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>{children}</p>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul className="list-disc pl-5 mb-2 flex flex-col gap-1">{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol className="list-decimal pl-5 mb-2 flex flex-col gap-1">{children}</ol>
  ),
  li: ({ children }: React.PropsWithChildren) => (
    <li className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{children}</li>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{children}</strong>
  ),
};

// Splits the guide into search/scroll targets on blank-line boundaries,
// then further splits any resulting list block into its individual items
// (keeping wrapped continuation lines attached to the item they belong to)
// — otherwise a whole multi-bullet section (e.g. "Reading citations") would
// be one giant match target, jumping to its top instead of the specific
// bullet that actually matched. Highlighting is done at this block level,
// not per-word, since ReactMarkdown doesn't expose a hook to wrap matches
// inside its own rendered (nested <strong>/<li>) output.
const _LIST_ITEM_RE = /^(-|\d+\.)\s/;

function splitBlocks(guide: string): string[] {
  const paras = guide.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  const blocks: string[] = [];
  for (const para of paras) {
    const lines = para.split("\n");
    const isList = _LIST_ITEM_RE.test(lines[0]) && lines.some((l, i) => i > 0 && _LIST_ITEM_RE.test(l));
    if (!isList) { blocks.push(para); continue; }
    let current: string[] = [];
    for (const line of lines) {
      if (_LIST_ITEM_RE.test(line) && current.length) {
        blocks.push(current.join("\n"));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length) blocks.push(current.join("\n"));
  }
  return blocks;
}

// Search should match what a reader actually SEES, not literal
// "**bold**"/"##" markdown syntax characters.
function plainText(block: string): string {
  return block.replace(/[#*`_]/g, "");
}

export default function MmRagUserGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const blocks = useMemo(() => splitBlocks(MM_RAG_GUIDE), []);
  const matchIndices = useMemo(
    () => query.trim() ? blocks.reduce<number[]>((acc, b, i) => (textMatches(plainText(b), query) ? [...acc, i] : acc), []) : [],
    [blocks, query]
  );
  const activeIdx = matchIndices.length ? matchIndices[matchCursor % matchIndices.length] : null;

  useEffect(() => { setMatchCursor(0); }, [query]);
  useEffect(() => {
    if (activeIdx == null) return;
    blockRefs.current[activeIdx]?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchCursor, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "rgba(10,16,28,0.98)", border: `1px solid ${ACCENT}30` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
            User Guide — Multimodal RAG
          </span>
          <button onClick={onClose} aria-label="Close guide"
            className="text-lg leading-none px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            ×
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-5 py-2 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search this guide…"
            className="flex-1 text-[11px] px-2 py-1 rounded border bg-transparent outline-none"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
          />
          {query.trim() && (
            <>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {matchIndices.length ? `${(matchCursor % matchIndices.length) + 1}/${matchIndices.length}` : "0"}
              </span>
              <button onClick={() => setMatchCursor(c => c - 1)} disabled={!matchIndices.length}
                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                ↑
              </button>
              <button onClick={() => setMatchCursor(c => c + 1)} disabled={!matchIndices.length}
                className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                ↓
              </button>
            </>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-4">
          {blocks.map((block, i) => (
            <div key={i} ref={el => { blockRefs.current[i] = el; }}
              style={{
                background: activeIdx === i ? `${ACCENT}18` : "transparent",
                borderRadius: 6, transition: "background 0.2s",
              }}>
              <ReactMarkdown components={MD}>{block}</ReactMarkdown>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}