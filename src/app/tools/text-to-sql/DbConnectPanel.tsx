"use client";

const ACCENT = "#6366f1";

export type DbSource = "demo" | "upload" | "postgres" | "mysql";

interface Props {
  dbSource: DbSource;
  setDbSource: (s: DbSource) => void;
  uploadDb: (f: File) => void;
  pgConn: string;
  setPgConn: (s: string) => void;
  connectPg: () => void;
  mysqlConn: string;
  setMysqlConn: (s: string) => void;
  connectMySQL: () => void;
  loadDemoSchema: () => void;
  status: string;
}

const TABS: { id: DbSource; label: string }[] = [
  { id: "demo",     label: "Chinook Demo" },
  { id: "upload",   label: "Upload File" },
  { id: "postgres", label: "PostgreSQL" },
  { id: "mysql",    label: "MySQL" },
];

export default function DbConnectPanel({
  dbSource, setDbSource,
  uploadDb,
  pgConn, setPgConn, connectPg,
  mysqlConn, setMysqlConn, connectMySQL,
  loadDemoSchema,
  status,
}: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setDbSource(id)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={{
              borderColor: dbSource === id ? ACCENT : "rgba(255,255,255,0.1)",
              color:       dbSource === id ? ACCENT : "#9ca3af",
              background:  dbSource === id ? `${ACCENT}18` : "transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {dbSource === "demo" && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">Chinook music store — 11 tables, ~3.5k rows</p>
          <button onClick={loadDemoSchema} className="text-xs px-3 py-1 rounded-lg text-white"
            style={{ background: ACCENT }}>
            Load Schema
          </button>
        </div>
      )}

      {dbSource === "upload" && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-xs text-gray-400">.db · .sqlite · .duckdb · .parquet · .csv</span>
            <input type="file"
              accept=".db,.sqlite,.sqlite3,.duckdb,.parquet,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDb(f); }} />
            <span className="text-xs px-3 py-1 rounded-lg text-white shrink-0" style={{ background: ACCENT }}>
              Choose File
            </span>
          </label>
        </div>
      )}

      {(dbSource === "postgres" || dbSource === "mysql") && (
        <div className="flex gap-2">
          <input
            value={dbSource === "postgres" ? pgConn : mysqlConn}
            onChange={e => dbSource === "postgres" ? setPgConn(e.target.value) : setMysqlConn(e.target.value)}
            placeholder={
              dbSource === "postgres"
                ? "postgresql://user:pass@host:5432/db"
                : "mysql://user:pass@host:3306/db"
            }
            className="flex-1 text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-gray-200 placeholder-gray-600 outline-none" />
          <button
            onClick={dbSource === "postgres" ? connectPg : connectMySQL}
            className="text-xs px-3 py-1 rounded-lg text-white shrink-0"
            style={{ background: ACCENT }}>
            Connect
          </button>
        </div>
      )}

      {status && <p className="text-[11px] mt-2" style={{ color: ACCENT }}>{status}</p>}
    </div>
  );
}