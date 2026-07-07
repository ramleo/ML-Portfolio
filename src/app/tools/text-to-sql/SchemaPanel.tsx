"use client";

import { useState } from "react";

interface Col { name: string; type: string; pk: boolean; }
interface Table { columns: Col[]; row_count: number; }

interface Props { schema: Record<string, Table> | null; accent: string; }

export default function SchemaPanel({ schema, accent }: Props) {
  const [search, setSearch] = useState("");

  if (!schema) return <p className="text-xs text-gray-500 px-2">No DB loaded yet.</p>;

  const q = search.toLowerCase();
  const filtered = Object.entries(schema).filter(([tn, t]) =>
    !q || tn.toLowerCase().includes(q) || t.columns.some(c => c.name.toLowerCase().includes(q)));

  return (
    <div className="flex flex-col gap-1">
      <div className="relative mb-1">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tables / columns…"
          className="w-full text-[10px] bg-black/30 border border-white/10 rounded px-2 py-1 text-gray-300 placeholder-gray-600 outline-none pr-6"/>
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-[10px]">✕</button>
        )}
      </div>
      {!filtered.length && <p className="text-[10px] text-gray-600 px-2">No match</p>}
      {filtered.map(([tn, t]) => (
        <details key={tn} className="group" open={!!q}>
          <summary className="cursor-pointer text-xs font-mono px-2 py-1 rounded hover:bg-white/5 flex items-center gap-1">
            <span style={{ color: accent }}>▶</span> {tn}
            <span className="ml-auto text-[10px] text-gray-500">{t.row_count.toLocaleString()}</span>
          </summary>
          <div className="pl-4 pb-1">
            {t.columns.map(c => (
              <div key={c.name} className="text-[10px] font-mono text-gray-400 flex gap-2">
                <span style={{ color: c.pk ? accent : (q && c.name.toLowerCase().includes(q)) ? "#fbbf24" : undefined }}>
                  {c.name}
                </span>
                <span className="text-gray-600">{c.type}</span>
                {c.pk && <span style={{ color: accent }} className="text-[9px]">PK</span>}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}