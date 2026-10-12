"use client";

import { useRef } from "react";

/**
 * A plain-textarea code field with a scroll-synced line-number gutter.
 *
 * Kept deliberately light (no CodeMirror/Monaco): the gutter is an aria-hidden
 * <pre> absolutely pinned to the left, clipped to the textarea's box, and scrolled
 * programmatically to match the textarea on every scroll. `wrap="off"` keeps one
 * logical line on one visual row so the numbers stay aligned (long lines scroll
 * horizontally, as in any code editor). The textarea itself stays the source of
 * truth and the only focusable element, so paste / edit / resize behave as before.
 */
export default function CodeEditor({
  value, onChange, placeholder, rows = 12,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutRef = useRef<HTMLPreElement>(null);

  const lineCount = value ? value.split("\n").length : 1;
  const nums = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
  const digits = String(lineCount).length;
  const gutterW = `calc(${digits}ch + 16px)`;

  const sync = () => {
    if (gutRef.current && taRef.current) gutRef.current.scrollTop = taRef.current.scrollTop;
  };

  return (
    <div className="relative rounded-lg overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <pre ref={gutRef} aria-hidden
        className="absolute top-0 left-0 bottom-0 m-0 py-2.5 px-2 text-right text-[12px] font-mono leading-relaxed overflow-hidden select-none pointer-events-none"
        style={{ width: gutterW, color: "var(--text3)", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        {nums}
      </pre>
      <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)} onScroll={sync}
        placeholder={placeholder} rows={rows} spellCheck={false} wrap="off"
        className="block w-full text-[12px] font-mono py-2.5 pr-3 outline-none resize-y leading-relaxed"
        style={{ background: "transparent", color: "var(--text)", paddingLeft: `calc(${gutterW} + 12px)` }} />
    </div>
  );
}
