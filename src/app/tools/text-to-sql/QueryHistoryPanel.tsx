"use client";

import { useState } from "react";

const ACCENT = "#6a6cc8";

interface HistoryTurn { question: string; sql: string; result_summary: string; count: number; timestamp?: number; }

interface Props {
  history: HistoryTurn[];
  onClear: () => void;
  onReuse: (q: string) => void;
}

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function dotColor(count: number): string {
  if (count === 0) return "#6b7280";
  if (count < 10)  return "#10b981";
  if (count < 100) return ACCENT;
  return "#f59e0b";
}

export default function QueryHistoryPanel({ history, onClear, onReuse }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const maxCount = Math.max(...history.map(t => t.count), 1);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 group">
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`text-[var(--text3)] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wide group-hover:text-[var(--text)] transition-colors">
            History · {history.length} {history.length === 1 ? "turn" : "turns"}
          </span>
        </button>
        <button onClick={onClear} className="text-[10px] text-[var(--text3)] hover:text-red-400 transition-colors">
          Clear
        </button>
      </div>

      {open && (
        <div className="mt-3 relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border2)]" />
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {history.map((turn, i) => {
              const clr = dotColor(turn.count);
              const pct = Math.round((turn.count / maxCount) * 100);
              return (
                <div key={i} className="pl-5 relative">
                  <div
                    className="absolute left-0 top-[9px] w-3.5 h-3.5 rounded-full border-2 border-[var(--bg)]"
                    style={{ background: clr }}
                  />
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-glass)] overflow-hidden">
                    <button
                      className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[rgba(var(--fg-rgb),0.05)] transition-colors"
                      onClick={() => setExpanded(expanded === i ? null : i)}>
                      <div className="flex flex-col items-start shrink-0 mt-0.5 gap-0.5">
                        <span className="text-[9px] font-mono text-[var(--text3)]">Q{i + 1}</span>
                        {turn.timestamp && <span className="text-[9px] text-[var(--text3)] tabular-nums">{relTime(turn.timestamp)}</span>}
                      </div>
                      <span className="text-[11px] text-[var(--text)] flex-1 leading-snug">{turn.question}</span>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[10px] font-mono" style={{ color: clr }}>
                          {turn.count.toLocaleString()} rows
                        </span>
                        <div className="w-12 h-1 rounded-full bg-[var(--border2)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: clr }} />
                        </div>
                      </div>
                    </button>
                    {expanded === i && (
                      <div className="border-t border-[var(--border)]">
                        <pre className="px-3 py-2 text-[10px] font-mono text-green-300/80 whitespace-pre-wrap leading-relaxed">
                          {turn.sql}
                        </pre>
                        <button
                          onClick={() => { onReuse(turn.question); setExpanded(null); }}
                          className="w-full text-[10px] py-1.5 text-center border-t border-[var(--border)] text-[var(--text3)] hover:text-indigo-400 transition-colors">
                          ↑ Re-use this question
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}