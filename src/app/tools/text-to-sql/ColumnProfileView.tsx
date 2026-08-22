"use client";

interface FKRel  { from_col: string; to_table: string; to_col: string; }
interface Col    { name: string; type: string; pk: boolean; }
interface Table  { columns: Col[]; row_count: number; foreign_keys?: FKRel[]; }
interface Props  { schema: Record<string, Table>; onClose: () => void; }

const TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  VARCHAR:   { color: "#818cf8", bg: "rgba(99,102,241,0.12)",  label: "TEXT"    },
  TEXT:      { color: "#818cf8", bg: "rgba(99,102,241,0.12)",  label: "TEXT"    },
  CHAR:      { color: "#818cf8", bg: "rgba(99,102,241,0.12)",  label: "TEXT"    },
  BIGINT:    { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "INTEGER" },
  INTEGER:   { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "INTEGER" },
  INT:       { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "INTEGER" },
  SMALLINT:  { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "INTEGER" },
  DOUBLE:    { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "FLOAT"   },
  FLOAT:     { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "FLOAT"   },
  REAL:      { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "FLOAT"   },
  DECIMAL:   { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "FLOAT"   },
  NUMERIC:   { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "FLOAT"   },
  BOOLEAN:   { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "BOOL"    },
  DATE:      { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "DATE"    },
  TIMESTAMP: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "DATE"    },
  DATETIME:  { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "DATE"    },
  JSON:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "JSON"    },
  BLOB:      { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "BLOB"    },
};

function getTypeMeta(rawType: string | null | undefined) {
  const base = (rawType ?? "").split("(")[0].toUpperCase().trim();
  return TYPE_META[base] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", label: base.slice(0, 7) || "?" };
}

function TypeIcon({ rawType }: { rawType: string | null | undefined }) {
  const base = (rawType ?? "").split("(")[0].toUpperCase().trim();
  // TEXT
  if (["VARCHAR","TEXT","CHAR"].includes(base)) return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M1 3h10M1 6h7M1 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  // INTEGER
  if (["BIGINT","INTEGER","INT","SMALLINT"].includes(base)) return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M4 2v8M4 2L2 4M4 2l2 2M8 10V4l-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  // FLOAT
  if (["DOUBLE","FLOAT","REAL","DECIMAL","NUMERIC"].includes(base)) return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="3" cy="9" r="1" fill="currentColor"/>
      <circle cx="9" cy="3" r="1" fill="currentColor"/>
      <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  // DATE
  if (["DATE","TIMESTAMP","DATETIME"].includes(base)) return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6 4v2.5L8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export default function ColumnProfileView({ schema, onClose }: Props) {
  const name  = Object.keys(schema)[0];
  const table = schema[name];
  const cols  = table.columns;

  // Aggregate type counts for summary bar
  const typeCounts: Record<string, number> = {};
  cols.forEach(c => {
    const lbl = getTypeMeta(c.type).label;
    typeCounts[lbl] = (typeCounts[lbl] ?? 0) + 1;
  });
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] shrink-0"
        style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.06) 0%, transparent 60%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="4" rx="1" stroke="#818cf8" strokeWidth="1.3"/>
              <rect x="1" y="7" width="14" height="1.2" rx="0.6" fill="#818cf8" opacity="0.4"/>
              <rect x="1" y="10" width="14" height="1.2" rx="0.6" fill="#818cf8" opacity="0.3"/>
              <rect x="1" y="13" width="10" height="1.2" rx="0.6" fill="#818cf8" opacity="0.2"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text)]">Column Profile</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                {name}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-[var(--text3)]">{table.row_count.toLocaleString()} rows</span>
              <span className="text-[var(--text3)]">·</span>
              <span className="text-[11px] text-[var(--text3)]">{cols.length} columns</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-white/8 transition-all">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Type distribution summary */}
      <div className="px-6 py-3 border-b border-[var(--border)] shrink-0 flex items-center gap-4 flex-wrap">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text3)]">Type breakdown</span>
        {typeEntries.map(([lbl, count]) => {
          const meta = Object.values(TYPE_META).find(m => m.label === lbl)
            ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", label: lbl };
          return (
            <div key={lbl} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }}/>
              <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{lbl}</span>
              <span className="text-[11px] text-[var(--text3)]">×{count}</span>
            </div>
          );
        })}
        {/* Visual proportional bar */}
        <div className="ml-auto flex h-2 rounded-full overflow-hidden gap-px" style={{ width: 120 }}>
          {typeEntries.map(([lbl, count]) => {
            const meta = Object.values(TYPE_META).find(m => m.label === lbl)
              ?? { color: "#94a3b8", bg: "", label: lbl };
            return (
              <div key={lbl} style={{ background: meta.color, width: `${(count / cols.length) * 100}%`, opacity: 0.7 }}/>
            );
          })}
        </div>
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-auto">
        {/* Table header */}
        <div className="sticky top-0 z-10 px-6 py-2 grid grid-cols-[24px_1fr_120px_60px] gap-3 items-center border-b border-[var(--border)]"
          style={{ background: "var(--bg)" }}>
          <div/>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text3)]">Column</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text3)]">Type</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text3)] text-right">Flags</span>
        </div>

        <div className="px-3 py-2 space-y-1">
          {cols.map((col, i) => {
            const isPk  = col.pk;
            const isFk  = (table.foreign_keys ?? []).some(f => f.from_col === col.name);
            const meta  = getTypeMeta(col.type);
            const rawLbl = col.type.split("(")[0].toUpperCase();

            return (
              <div key={col.name}
                className="group px-3 py-2.5 rounded-xl grid grid-cols-[24px_1fr_120px_60px] gap-3 items-center transition-all"
                style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.07)")}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent")}>

                {/* Row number */}
                <span className="text-[10px] text-[var(--text3)] font-mono text-right select-none">{i + 1}</span>

                {/* Column name + type icon */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: meta.bg, color: meta.color }}>
                    <TypeIcon rawType={col.type} />
                  </div>
                  <span className="text-[13px] font-medium truncate"
                    style={{ color: isPk ? "#fbbf24" : isFk ? "#818cf8" : "var(--text)" }}>
                    {col.name}
                  </span>
                  {isPk && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="shrink-0 ml-0.5">
                      <circle cx="4.5" cy="4.5" r="3" stroke="#fbbf24" strokeWidth="1.5"/>
                      <path d="M7 7l3.5 3.5M9 7.5l1 1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>

                {/* Type badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide"
                    style={{ color: meta.color, background: meta.bg }}>
                    {rawLbl}
                  </span>
                </div>

                {/* Flags */}
                <div className="flex items-center justify-end gap-1">
                  {isPk && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                      style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                      PK
                    </span>
                  )}
                  {isFk && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                      FK
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-5 px-6 py-2.5 border-t border-[var(--border)] shrink-0"
        style={{ background: "var(--bg)" }}>
        {[
          { color: "#818cf8", label: "TEXT" },
          { color: "#34d399", label: "INTEGER" },
          { color: "#fb923c", label: "FLOAT" },
          { color: "#38bdf8", label: "DATE" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: color, opacity: 0.8 }}/>
            <span className="text-[10px] text-[var(--text3)]">{label}</span>
          </span>
        ))}
        <span className="ml-auto text-[10px] text-[var(--text3)]">Single-table upload — no relationships to diagram</span>
      </div>
    </div>
  );
}