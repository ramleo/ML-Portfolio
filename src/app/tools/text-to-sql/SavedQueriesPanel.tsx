"use client";
import { useState, useEffect, useCallback } from "react";

interface SavedQuery { id: string; name: string; question: string; sql: string; savedAt: number; }
const KEY = "ml_sql_saved";
function load(): SavedQuery[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }

export default function SavedQueriesPanel({
  currentQuery,
  onLoad,
}: {
  currentQuery: { question: string; sql: string } | null;
  onLoad: (question: string) => void;
}) {
  const [saved, setSaved]     = useState<SavedQuery[]>([]);
  const [open, setOpen]       = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => { setSaved(load()); }, []);

  const saveQuery = useCallback(() => {
    if (!currentQuery?.sql) return;
    const entry: SavedQuery = {
      id: Date.now().toString(),
      name: currentQuery.question.slice(0, 60),
      question: currentQuery.question,
      sql: currentQuery.sql,
      savedAt: Date.now(),
    };
    const updated = [entry, ...saved.filter(s => s.question !== currentQuery.question)].slice(0, 20);
    setSaved(updated);
    setSavedId(entry.id);
    setTimeout(() => setSavedId(null), 1500);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  }, [currentQuery, saved]);

  const deleteQuery = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = saved.filter(s => s.id !== id);
    setSaved(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  }, [saved]);

  const isAlreadySaved = currentQuery ? saved.some(s => s.question === currentQuery.question) : false;

  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={() => setOpen(o => !o)}
          className="text-[9px] font-semibold text-indigo-400/50 flex items-center gap-1 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <svg width="9" height="9" viewBox="0 0 8 8" fill="none"><path d={open ? "M1 3l3 3 3-3" : "M3 1l3 3-3 3"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Saved {saved.length > 0 && `(${saved.length})`}
        </button>
        {currentQuery?.sql && (
          <button onClick={saveQuery}
            className="text-[9px] flex items-center gap-0.5 transition-colors"
            style={{ color: savedId ? "#10b981" : isAlreadySaved ? "#6366f1" : "#4b5563" }}>
            {savedId ? (
              <>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Saved
              </>
            ) : (
              <>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 2h5l1 1v5.5a.5.5 0 01-.5.5h-5a.5.5 0 01-.5-.5V2.5A.5.5 0 012 2z" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 2v2.5h3V2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                {isAlreadySaved ? "Saved" : "Save"}
              </>
            )}
          </button>
        )}
      </div>
      {open && saved.length === 0 && (
        <p className="text-[9px] text-gray-700 italic mt-1">No saved queries yet — run a query and click Save</p>
      )}
      {open && saved.map(s => (
        <div key={s.id} className="flex items-center gap-1 py-0.5 group">
          <button onClick={() => { onLoad(s.question); }}
            className="flex-1 text-left text-[10px] text-gray-500 hover:text-indigo-300 transition-colors truncate py-0.5">
            {s.name}
          </button>
          <button onClick={e => deleteQuery(s.id, e)}
            className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}