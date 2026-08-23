"use client";

import { useState, useRef, useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { ExtractedField } from "./_types";

const ACCENT = "#06b6d4";

interface Msg { role: "user" | "assistant"; content: string; }

interface Props {
  docText: string;
  fields: ExtractedField[];
}

const SUGGESTIONS = [
  "Summarize this document in two sentences",
  "What should I double-check in this document?",
  "Are any important details missing?",
];

export default function DocChatPanel({ docText, fields }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/document/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          doc_text: docText,
          fields: fields.map(f => ({ name: f.name, label: f.label, value: f.value })),
          history: messages.slice(-6),
        }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages(prev => prev.slice(0, -1)); // roll back the unanswered question
      setInput(q);
    } finally {
      setBusy(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(14px)",
    border: "1px solid var(--border)",
    borderRadius: 16,
  };

  return (
    <div style={cardStyle} className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--border)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: ACCENT }}>
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: `${ACCENT}99` }}>
          Ask this document
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
        style={{ maxHeight: 260, minHeight: 80 }}>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)}
                className="text-[9px] px-2 py-1 rounded-full border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
                style={{ borderColor: "rgba(6,182,212,0.25)", color: `${ACCENT}cc` }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
            m.role === "user" ? "self-end" : "self-start"}`}
            style={m.role === "user"
              ? { background: "rgba(6,182,212,0.12)", color: "var(--text)" }
              : { background: "var(--bg-glass)", color: "var(--text2)" }}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="self-start px-3 py-2 rounded-xl text-[11px]"
            style={{ background: "var(--bg-glass)", color: "var(--text3)" }}>
            Thinking…
          </div>
        )}
        {error && (
          <div className="text-[10px] px-2 py-1 rounded"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
            {error}
          </div>
        )}
      </div>

      <form className="flex gap-2 p-3 border-t" style={{ borderColor: "var(--border)" }}
        onSubmit={e => { e.preventDefault(); ask(input); }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about this document…"
          className="flex-1 bg-transparent text-[11px] px-3 py-2 rounded-lg border outline-none"
          style={{ borderColor: "var(--border2)", color: "var(--text)" }}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}
          className="px-3 py-2 rounded-lg text-[11px] font-medium transition-opacity disabled:opacity-30"
          style={{ background: "rgba(6,182,212,0.15)", color: ACCENT, border: "1px solid rgba(6,182,212,0.3)" }}>
          Ask
        </button>
      </form>
    </div>
  );
}