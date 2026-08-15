"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "./_types";

const KEY = "di_history_v1";
const MAX = 5;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry) {
  try {
    const list = [entry, ...loadHistory().filter(e => e.id !== entry.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded (very long doc texts) — retry without doc texts
    try {
      const slim = [{ ...entry, docText: "" }, ...loadHistory().map(e => ({ ...e, docText: "" }))].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch { /* localStorage unavailable — history disabled */ }
  }
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DocHistory({ onRestore }: { onRestore: (e: HistoryEntry) => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => { setEntries(loadHistory()); }, []);

  if (entries.length === 0) return null;

  const clear = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setEntries([]);
  };

  return (
    <div style={{
      background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)",
      borderRadius: 14,
    }} className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "rgba(255,255,255,0.35)" }}>
          Recent documents
        </span>
        <button onClick={clear} className="text-[8px] px-1.5 py-0.5 rounded border transition-colors hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map(e => (
          <button key={e.id} onClick={() => onRestore(e)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"
              style={{ color: "rgba(255,255,255,0.25)" }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                {e.fileName}
              </span>
              <span className="block text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {e.docTypeLabel ?? "Document"} · {e.fields.length} fields · {timeAgo(e.at)}
              </span>
            </span>
            <span className="text-[8px] px-1.5 py-px rounded shrink-0"
              style={{ background: "rgba(6,182,212,0.08)", color: "#67e8f9" }}>
              Restore
            </span>
          </button>
        ))}
      </div>
      <p className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>
        Stored in your browser only · restores fields &amp; chat (not the page preview)
      </p>
    </div>
  );
}