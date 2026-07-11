"use client";

import { useState, useEffect } from "react";
import SqlChart from "./SqlChart";
import { highlightSQL, formatCell, cleanErr, csvEscape, downloadFile, exportNotebook } from "./_utils";

const ML_SQL_URL = process.env.NEXT_PUBLIC_ML_SQL_URL ?? "https://wram1708-ml-sql.hf.space";

interface Results {
  columns: string[];
  rows: unknown[][];
  count: number;
  exec_time_ms: number;
}

interface Props {
  generatedSql: string | null;
  copied: boolean;
  copySQL: () => void;
  results: Results | null;
  error: string | null;
  question?: string;
  currentPage?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onFilter?: (text: string) => Promise<void>;
  onClearFilter?: () => void;
  filterActive?: boolean;
  onRetry?: () => void;
  provider?: string;
  onRunSQL?: (sql: string) => Promise<void>;
  onSuggest?: (q: string) => void;
}

export default function QueryResultPanel({
  generatedSql, copied, copySQL, results, error, question,
  currentPage = 1, totalCount = -1, pageSize = 50, onPageChange,
  onFilter, onClearFilter, filterActive, onRetry, provider, onRunSQL, onSuggest,
}: Props) {
  const [filterText, setFilterText] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);
  const [localExpl, setLocalExpl] = useState("");
  const [explLoading, setExplLoading] = useState(false);
  const [explErr, setExplErr] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sqlExpl, setSqlExpl] = useState("");
  const [sqlExplLoading, setSqlExplLoading] = useState(false);
  const [sqlExplErr, setSqlExplErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedSql, setEditedSql] = useState("");
  const [sqlEdited, setSqlEdited] = useState(false);

  useEffect(() => { if (!filterActive) setFilterText(""); }, [filterActive]);
  useEffect(() => { setLocalExpl(""); setSuggestions([]); setExplErr(null); }, [results]);
  useEffect(() => { setSqlExpl(""); setSqlExplErr(null); }, [generatedSql]);
  useEffect(() => {
    setEditedSql(generatedSql ?? "");
    setSqlEdited(false);
    setEditing(false);
  }, [generatedSql]);

  const handleSqlChange = (val: string) => {
    setEditedSql(val);
    if (!sqlEdited && val !== generatedSql) {
      setSqlEdited(true);
      const sid = (typeof window !== "undefined" && localStorage.getItem("_ml_session")) ?? "";
      fetch("/api/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sql_edited", path: window.location.pathname, session_id: sid, meta: {} }),
      }).catch(() => {});
    }
  };

  const fetchSqlExplanation = async () => {
    if (!generatedSql || sqlExplLoading) return;
    setSqlExplLoading(true); setSqlExplErr(null); setSqlExpl("");
    try {
      const resp = await fetch(`${ML_SQL_URL}/sql/explain`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question ?? "", sql: generatedSql, columns: [], rows: [], provider: provider ?? "groq" }),
      });
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") setSqlExpl(prev => prev + ev.text);
            else if (ev.type === "error") setSqlExplErr(cleanErr(ev.text));
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setSqlExplErr(e instanceof Error ? e.message : "Explanation failed");
    } finally { setSqlExplLoading(false); }
  };

  const fetchExplanation = async () => {
    if (!results || !generatedSql || explLoading) return;
    setExplLoading(true); setExplErr(null); setLocalExpl(""); setSuggestions([]);
    try {
      const resp = await fetch(`${ML_SQL_URL}/sql/explain`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question ?? "", sql: generatedSql, columns: results.columns, rows: results.rows.slice(0, 10), provider: provider ?? "groq" }),
      });
      const reader = resp.body?.getReader();
      const dec = new TextDecoder();
      if (!reader) throw new Error("No response body");
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") setLocalExpl(prev => prev + ev.text);
            else if (ev.type === "suggestions") setSuggestions(ev.questions ?? []);
            else if (ev.type === "error") setExplErr(cleanErr(ev.text));
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setExplErr(e instanceof Error ? e.message : "Explanation failed");
    } finally { setExplLoading(false); }
  };

  const handleFilter = async () => {
    if (!filterText.trim() || !onFilter) return;
    setFilterLoading(true);
    await onFilter(filterText.trim());
    setFilterLoading(false);
  };

  return (
    <>
      {error && (() => {
        const isConfigErr = /API_KEY not configured/.test(error);
        const isExhausted = error.includes("All providers failed");
        const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Provider";
        const canRetry = !isConfigErr && !isExhausted;
        return (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 flex items-start gap-2.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="6.5" stroke="#f87171" strokeWidth="1.3"/>
              <path d="M8 5v4M8 11v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-400 leading-relaxed">{cleanErr(error)}</p>
              {isConfigErr && (
                <p className="text-[11px] text-gray-500 mt-1">{providerLabel} key isn&apos;t configured — switch provider in the dropdown.</p>
              )}
              {canRetry && onRetry && (
                <button onClick={onRetry} className="mt-2 flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M10 6A4 4 0 112 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10 3v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Try again
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {generatedSql && (
        <div className="rounded-xl border border-indigo-500/20 bg-black/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wide">Generated SQL</span>
              {sqlEdited && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400">Edited</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={fetchSqlExplanation} disabled={sqlExplLoading}
                className="text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-400/60 hover:text-indigo-300 hover:border-indigo-500/40 disabled:opacity-40 transition-colors">
                {sqlExplLoading ? "…" : "Explain"}
              </button>
              <button onClick={() => setEditing(e => !e)}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/30 transition-colors">
                {editing ? "Done" : "Edit"}
              </button>
              <button onClick={copySQL} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editedSql}
                onChange={e => handleSqlChange(e.target.value)}
                rows={Math.max(3, editedSql.split("\n").length + 1)}
                spellCheck={false}
                className="w-full text-xs font-mono bg-black/60 border border-indigo-500/30 rounded-lg px-3 py-2 text-gray-300 outline-none resize-none focus:border-indigo-500/60 transition-colors leading-relaxed"
              />
              {onRunSQL && (
                <button
                  onClick={async () => { await onRunSQL(editedSql); setEditing(false); }}
                  className="self-end flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 transition-all">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
                  Run edited SQL
                </button>
              )}
            </div>
          ) : (
            <pre className="text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{highlightSQL(editedSql)}</pre>
          )}
          {sqlExplErr && (
            <p className="mt-2 text-[11px] text-red-400">{sqlExplErr}</p>
          )}
          {sqlExpl && (
            <div className="mt-3 pt-3 border-t border-indigo-500/15">
              <p className="text-[9px] font-semibold text-indigo-400/50 uppercase tracking-widest mb-1.5">Query explanation</p>
              <p className="text-[12px] text-gray-300 leading-relaxed">{sqlExpl}</p>
            </div>
          )}
        </div>
      )}

      {results && results.columns.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Results</span>
            <span className="text-[11px] text-gray-500">{results.count} rows · {results.exec_time_ms}ms</span>
            {filterActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Filter active</span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => downloadFile([results.columns.map(csvEscape).join(","), ...results.rows.map(r => (r as unknown[]).map(csvEscape).join(","))].join("\n"), "results.csv", "text/csv")}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">CSV</button>
              <button onClick={() => downloadFile(JSON.stringify(results.rows.map(r => Object.fromEntries(results.columns.map((c, i) => [c, (r as unknown[])[i]]))), null, 2), "results.json", "application/json")}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">JSON</button>
              {generatedSql && (
                <button onClick={() => exportNotebook(question ?? "", generatedSql, localExpl)}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">.ipynb</button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0f0f0f] z-10">
                <tr className="border-b border-white/10">
                  {results.columns.map(c => (
                    <th key={c} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 hover:bg-white/[0.07] transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    {(row as unknown[]).map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                        {cell === null ? <span className="text-gray-600">null</span> : formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {totalCount > 0 && onPageChange && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                <span className="text-[11px] text-gray-500">
                  Rows {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}
                    className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
                  <span className="text-[11px] text-gray-500 px-1">{currentPage} / {Math.ceil(totalCount / pageSize)}</span>
                  <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
                </div>
              </div>
            )}
          </div>
          {onFilter && (
            <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
              <input value={filterText} onChange={e => setFilterText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && filterText.trim()) handleFilter(); }}
                placeholder="Filter rows… e.g. revenue > 1000, country is USA"
                className="flex-1 text-[11px] bg-black/30 border border-white/10 rounded px-2 py-1 text-gray-300 placeholder-gray-600 outline-none" />
              {filterActive && onClearFilter && (
                <button onClick={onClearFilter} className="text-[10px] text-amber-400 hover:text-white shrink-0 transition-colors">× Clear</button>
              )}
              <button onClick={handleFilter} disabled={!filterText.trim() || filterLoading}
                className="text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-40 transition-colors shrink-0">
                {filterLoading ? "Filtering…" : "Filter"}
              </button>
            </div>
          )}
        </div>
      )}

      {results && results.columns.length > 0 && <SqlChart cols={results.columns} rows={results.rows} />}

      {results && !localExpl && !explLoading && (
        <button onClick={fetchExplanation}
          className="self-start flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg border border-indigo-500/25 text-indigo-400/70 hover:text-indigo-300 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 2a5 5 0 100 10A5 5 0 007 2zM7 5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Explain with AI
        </button>
      )}

      {explLoading && (
        <div className="flex items-center gap-2 text-[11px] text-indigo-400/60">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/>
          </svg>
          Generating explanation…
        </div>
      )}

      {explErr && <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-xs text-red-400">{explErr}</div>}

      {localExpl && (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 2a5 5 0 100 10A5 5 0 007 2zM7 5v3M7 9.5v.5" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-widest">Explanation</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{localExpl}</p>
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-[9px] font-semibold text-indigo-400/50 uppercase tracking-widest">You might also ask</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q, i) => (
                  <button key={i} onClick={() => onSuggest?.(q)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-indigo-500/25 text-indigo-300/70 bg-indigo-500/5 hover:bg-indigo-500/15 hover:text-indigo-200 hover:border-indigo-500/50 transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}