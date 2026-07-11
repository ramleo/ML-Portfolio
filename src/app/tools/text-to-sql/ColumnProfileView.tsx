"use client";

interface FKRel  { from_col: string; to_table: string; to_col: string; }
interface Col    { name: string; type: string; pk: boolean; }
interface Table  { columns: Col[]; row_count: number; foreign_keys?: FKRel[]; }
interface Props  { schema: Record<string, Table>; onClose: () => void; }

const ACCENT = "#6366f1";

export default function ColumnProfileView({ schema, onClose }: Props) {
  const name  = Object.keys(schema)[0];
  const table = schema[name];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090f]">
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="4" rx="1" stroke={ACCENT} strokeWidth="1.2"/>
            <rect x="1" y="7" width="14" height="1.2" rx="0.6" fill="rgba(255,255,255,0.1)"/>
            <rect x="1" y="10" width="14" height="1.2" rx="0.6" fill="rgba(255,255,255,0.1)"/>
            <rect x="1" y="13" width="10" height="1.2" rx="0.6" fill="rgba(255,255,255,0.1)"/>
          </svg>
          <span className="text-sm font-semibold text-white">Column Profile</span>
          <span className="text-xs text-gray-500">{name} · {table.row_count.toLocaleString()} rows · {table.columns.length} columns</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/8 grid grid-cols-[1fr_auto_auto] gap-4">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">Column</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 w-24 text-right">Type</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 w-12 text-right">Flags</span>
          </div>
          {table.columns.map((col, i) => {
            const isPk = col.pk;
            const isFk = (table.foreign_keys ?? []).some(f => f.from_col === col.name);
            const lbl  = col.type.split("(")[0].toUpperCase();
            return (
              <div key={col.name} className={`px-4 py-2 grid grid-cols-[1fr_auto_auto] gap-4 items-center ${i % 2 === 0 ? "bg-white/[0.015]" : ""}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isPk && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <circle cx="4.5" cy="4.5" r="3" stroke="#f59e0b" strokeWidth="1.5"/>
                      <path d="M7 7l3.5 3.5M9 7.5l1 1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                  {isFk && !isPk && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <path d="M5 6a3 3 0 004.24 0l1.42-1.42a3 3 0 00-4.24-4.24L5 1.76" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M7 6a3 3 0 01-4.24 0L1.34 7.42a3 3 0 004.24 4.24L7 10.24" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                  <span className="text-[12px] truncate" style={{ color: isPk ? "#f59e0b" : isFk ? ACCENT : "rgba(255,255,255,0.8)" }}>{col.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 w-24 text-right font-mono">{lbl}</span>
                <div className="w-12 flex justify-end gap-1">
                  {isPk && <span className="text-[8px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-semibold">PK</span>}
                  {isFk && <span className="text-[8px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">FK</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-5 px-5 py-2 border-t border-white/8 shrink-0 bg-[#09090f]">
        <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <circle cx="4.5" cy="4.5" r="3" stroke="#f59e0b" strokeWidth="1.5"/>
            <path d="M7 7l3.5 3.5M9 7.5l1 1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Primary key
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4h7M6 1l3 3-3 3" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Foreign key
        </span>
        <span className="ml-auto text-[10px] text-gray-600">Single-table upload — no relationships to diagram</span>
      </div>
    </div>
  );
}