"use client";

import { useState, useEffect } from "react";
import SqlChart from "./SqlChart";
const ACCENT = "#6366f1";

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
  explanation: string;
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
}

function highlightSQL(sql: string) {
  const re = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|AS|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|AND|OR|NOT|IN|LIKE|IS|NULL|DISTINCT|COUNT|SUM|AVG|MAX|MIN|ROUND|WITH|UNION|ALL|BY|DESC|ASC|CASE|WHEN|THEN|ELSE|END)\b)/gi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m.index > last) parts.push(sql.slice(last, m.index));
    if (m[1] || m[2])  parts.push(<span key={m.index} className="text-emerald-400">{m[0]}</span>);
    else if (m[3])     parts.push(<span key={m.index} className="text-amber-400">{m[0]}</span>);
    else if (m[4])     parts.push(<span key={m.index} className="text-indigo-400 font-semibold">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < sql.length) parts.push(sql.slice(last));
  return parts;
}

function formatCell(cell: unknown): string {
  if (cell === null) return "";
  const n = Number(cell);
  if (!isNaN(n) && String(cell).trim() !== "" && String(cell) !== String(Math.round(n))) {
    return n.toFixed(2);
  }
  return String(cell);
}

function csvEscape(v: unknown): string {
  const s = v === null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadFile(content: string, name: string, mime: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: name,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportNotebook(question: string, sql: string, explanation: string) {
  const codeLines = [
    "import sqlite3\nimport pandas as pd\n\n",
    "# Download Chinook DB: https://github.com/lerocha/chinook-database\n",
    "conn = sqlite3.connect('chinook.db')\n\n",
    `df = pd.read_sql_query("""\n${sql}\n""", conn)\n`,
    "df",
  ].join("");
  const cells = [
    { cell_type: "markdown", metadata: {}, source: [`# ${question}`] },
    { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: [codeLines] },
    ...(explanation ? [{ cell_type: "markdown", metadata: {}, source: [`## Explanation\n\n${explanation}`] }] : []),
  ];
  const nb = {
    nbformat: 4, nbformat_minor: 5,
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python", version: "3.10.0" } },
    cells,
  };
  downloadFile(JSON.stringify(nb, null, 2), "query.ipynb", "application/json");
}

export default function QueryResultPanel({
  generatedSql, copied, copySQL, results, explanation, error, question,
  currentPage = 1, totalCount = -1, pageSize = 50, onPageChange,
  onFilter, onClearFilter, filterActive, onRetry, provider,
}: Props) {
  const [filterText, setFilterText] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => { if (!filterActive) setFilterText(""); }, [filterActive]);

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
              <p className="text-xs text-red-400 leading-relaxed">{error}</p>
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
            <span className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wide">Generated SQL</span>
            <button onClick={copySQL} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{generatedSql ? highlightSQL(generatedSql) : null}</pre>
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
              <button
                onClick={() => downloadFile(
                  [results.columns.map(csvEscape).join(","), ...results.rows.map(r => (r as unknown[]).map(csvEscape).join(","))].join("\n"),
                  "results.csv", "text/csv"
                )}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
                CSV
              </button>
              <button
                onClick={() => downloadFile(
                  JSON.stringify(results.rows.map(r => Object.fromEntries(results.columns.map((c, i) => [c, (r as unknown[])[i]]))), null, 2),
                  "results.json", "application/json"
                )}
                className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
                JSON
              </button>
              {generatedSql && (
                <button
                  onClick={() => exportNotebook(question ?? "", generatedSql, explanation)}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
                  .ipynb
                </button>
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
                        {cell === null
                          ? <span className="text-gray-600">null</span>
                          : formatCell(cell)}
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
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                  </button>
                  <span className="text-[11px] text-gray-500 px-1">
                    {currentPage} / {Math.ceil(totalCount / pageSize)}
                  </span>
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                    className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
          {onFilter && (
            <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
              <input
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && filterText.trim()) handleFilter(); }}
                placeholder="Filter rows… e.g. revenue > 1000, country is USA"
                className="flex-1 text-[11px] bg-black/30 border border-white/10 rounded px-2 py-1 text-gray-300 placeholder-gray-600 outline-none"
              />
              {filterActive && onClearFilter && (
                <button onClick={onClearFilter} className="text-[10px] text-amber-400 hover:text-white shrink-0 transition-colors">
                  × Clear
                </button>
              )}
              <button
                onClick={handleFilter}
                disabled={!filterText.trim() || filterLoading}
                className="text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white disabled:opacity-40 transition-colors shrink-0">
                {filterLoading ? "Filtering…" : "Filter"}
              </button>
            </div>
          )}
        </div>
      )}

      {results && results.columns.length > 0 && <SqlChart cols={results.columns} rows={results.rows} />}

      {explanation && (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 2a5 5 0 100 10A5 5 0 007 2zM7 5v3M7 9.5v.5" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-widest">Explanation</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
        </div>
      )}
    </>
  );
}