"use client";

import { useState } from "react";

interface Col { name: string; type: string; pk: boolean; }
interface FKRel { from_col: string; to_table: string; to_col: string; }
interface Table { columns: Col[]; row_count: number; foreign_keys?: FKRel[]; }
interface Props { schema: Record<string, Table> | null; accent: string; }

function typeColor(t: string) {
  const u = t.toUpperCase();
  if (/INT|SERIAL/.test(u))                    return { bg: "#10b98118", text: "#34d399", label: "INT" };
  if (/REAL|FLOAT|NUMERIC|DECIMAL|DOUBLE/.test(u)) return { bg: "#f59e0b18", text: "#fbbf24", label: "NUM" };
  if (/TEXT|CHAR|BLOB|CLOB|STRING/.test(u))    return { bg: "#38bdf818", text: "#7dd3fc", label: "TXT" };
  return { bg: "#6b728018", text: "#9ca3af", label: t.slice(0, 3).toUpperCase() };
}

export default function SchemaPanel({ schema, accent }: Props) {
  const [search, setSearch] = useState("");
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  if (!schema) return (
    <div className="flex flex-col items-center gap-2 py-6 px-2">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="6" rx="8" ry="3" stroke="#374151" strokeWidth="1.5"/>
        <path d="M4 6v4c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="#374151" strokeWidth="1.5"/>
        <path d="M4 10v4c0 1.657 3.582 3 8 3s8-1.343 8-3v-4" stroke="#374151" strokeWidth="1.5"/>
      </svg>
      <p className="text-[10px] text-gray-600 text-center">Load a database<br/>to explore schema</p>
    </div>
  );

  const q = search.toLowerCase();
  const filtered = Object.entries(schema).filter(([tn, t]) =>
    !q || tn.toLowerCase().includes(q) || t.columns.some(c => c.name.toLowerCase().includes(q)));

  const toggle = (tn: string) => setOpenTables(prev => {
    const n = new Set(prev); n.has(tn) ? n.delete(tn) : n.add(tn); return n;
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative mb-0.5">
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="#4b5563" strokeWidth="1.4"/>
          <path d="M9.5 9.5l2.5 2.5" stroke="#4b5563" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tables / columns…"
          className="w-full text-[10px] bg-black/40 border border-white/8 rounded-lg pl-6 pr-5 py-1.5 text-gray-300 placeholder-gray-600 outline-none focus:border-indigo-500/40 transition-colors"/>
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {!filtered.length && <p className="text-[10px] text-gray-600 text-center py-2">No match</p>}

      {filtered.map(([tn, t]) => {
        const isOpen = openTables.has(tn) || !!q;
        return (
          <div key={tn} className="rounded-lg border border-white/5 overflow-hidden bg-white/[0.02]">
            <button onClick={() => toggle(tn)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/5 transition-colors text-left">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <ellipse cx="6" cy="3.5" rx="4" ry="1.5" stroke={accent} strokeWidth="1.1"/>
                <path d="M2 3.5v2.5c0 .828 1.79 1.5 4 1.5s4-.672 4-1.5V3.5" stroke={accent} strokeWidth="1.1"/>
                <path d="M2 6v2.5c0 .828 1.79 1.5 4 1.5s4-.672 4-1.5V6" stroke={accent} strokeWidth="1.1"/>
              </svg>
              <span className="text-[10px] font-mono font-medium text-gray-200 flex-1 truncate">{tn}</span>
              <span className="text-[9px] text-gray-600 tabular-nums shrink-0">{t.row_count.toLocaleString()}</span>
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>
                <path d="M1.5 1.5l2.5 2-2.5 2" stroke="#4b5563" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-white/5 px-2 py-1.5 flex flex-col gap-0.5">
                {(() => {
                  const fkMap = new Map<string, string>((t.foreign_keys ?? []).map(fk => [fk.from_col, `→ ${fk.to_table}.${fk.to_col}`]));
                  return t.columns.map(c => {
                    const tc = typeColor(c.type);
                    const hi = q && c.name.toLowerCase().includes(q);
                    const fkTarget = fkMap.get(c.name);
                    return (
                      <div key={c.name} className="flex items-center gap-1.5 py-[2px]">
                        {c.pk
                          ? <span className="text-[8px] px-1 py-px rounded font-bold shrink-0" style={{ background: `${accent}22`, color: accent }}>PK</span>
                          : fkTarget
                            ? <span title={fkTarget} className="text-[8px] px-1 py-px rounded font-bold shrink-0 cursor-help" style={{ background: "#6d28d940", color: "#c4b5fd" }}>FK</span>
                            : <span className="text-[8px] px-1 py-px rounded font-medium shrink-0" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span>
                        }
                        <span className={`text-[10px] font-mono truncate ${hi ? "text-amber-300" : c.pk ? "text-indigo-300/90" : fkTarget ? "text-violet-300" : "text-gray-400"}`}>
                          {c.name}
                        </span>
                        {fkTarget && <span className="text-[8px] text-violet-400/70 shrink-0 font-sans">{fkTarget.split(".")[0]}</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}