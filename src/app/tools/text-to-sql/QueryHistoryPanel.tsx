"use client";

import { useState } from "react";

const ACCENT = "#6366f1";

interface HistoryTurn { question: string; sql: string; result_summary: string; count: number; }

interface Props {
  history: HistoryTurn[];
  onClear: () => void;
  onReuse: (q: string) => void;
}

function dotColor(count: number): string {
  if (count === 0) return "#6b7280";
  if (count < 10)  return "#10b981";
  if (count < 100) return ACCENT;
  return "#f59e0b";
}

export default function QueryHistoryPanel({ history, onClear, onReuse }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const maxCount = Math.max(...history.map(t => t.count), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          History · {history.length} {history.length === 1 ? "turn" : "turns"}
        </span>
        <button onClick={onClear} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
          Clear
        </button>
      </div>

      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
        <div className="flex flex-col gap-2">
          {history.map((turn, i) => {
            const clr = dotColor(turn.count);
            const pct = Math.round((turn.count / maxCount) * 100);
            return (
              <div key={i} className="pl-5 relative">
                <div
                  className="absolute left-0 top-[9px] w-3.5 h-3.5 rounded-full border-2 border-[#0f0f1a]"
                  style={{ background: clr }}
                />
                <div className="rounded-lg border border-white/5 bg-black/20 overflow-hidden">
                  <button
                    className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setExpanded(expanded === i ? null : i)}>
                    <span className="text-[9px] font-mono shrink-0 mt-0.5 text-gray-500">Q{i + 1}</span>
                    <span className="text-[11px] text-gray-300 flex-1 leading-snug">{turn.question}</span>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[10px] font-mono" style={{ color: clr }}>
                        {turn.count.toLocaleString()} rows
                      </span>
                      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: clr }} />
                      </div>
                    </div>
                  </button>
                  {expanded === i && (
                    <div className="border-t border-white/5">
                      <pre className="px-3 py-2 text-[10px] font-mono text-green-300/80 whitespace-pre-wrap leading-relaxed">
                        {turn.sql}
                      </pre>
                      <button
                        onClick={() => { onReuse(turn.question); setExpanded(null); }}
                        className="w-full text-[10px] py-1.5 text-center border-t border-white/5 text-gray-500 hover:text-indigo-400 transition-colors">
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
    </div>
  );
}