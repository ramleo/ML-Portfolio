"use client";

const ACCENT = "#6366f1";

export type DbSource = "demo" | "upload" | "postgres" | "mysql" | "mssql";

interface Props {
  dbSource: DbSource; setDbSource: (s: DbSource) => void;
  uploadDb: (f: File) => void;
  pgConn: string; setPgConn: (s: string) => void; connectPg: () => void;
  mysqlConn: string; setMysqlConn: (s: string) => void; connectMySQL: () => void;
  mssqlConn: string; setMssqlConn: (s: string) => void; connectMssql: () => void;
  loadDemoSchema: () => void; status: string;
}

const TABS: { id: DbSource; label: string; icon: React.ReactNode }[] = [
  { id: "demo", label: "Chinook Demo", icon: (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <ellipse cx="6" cy="3" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M2 3v2.5c0 .828 1.79 1.5 4 1.5s4-.672 4-1.5V3" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M2 5.5v2.5c0 .828 1.79 1.5 4 1.5s4-.672 4-1.5V5.5" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  )},
  { id: "upload", label: "Upload File", icon: (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 8V3M4 5l2-2 2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 9.5h8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )},
  { id: "postgres", label: "PostgreSQL", icon: (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4 5h4M4 7h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )},
  { id: "mysql", label: "MySQL", icon: (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4 8V4l2 2.5L8 4v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: "mssql", label: "SQL Server", icon: (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="1.5" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4 4.5h4M4 6.5h4M4 8.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )},
];

import type React from "react";

export default function DbConnectPanel({
  dbSource, setDbSource, uploadDb,
  pgConn, setPgConn, connectPg,
  mysqlConn, setMysqlConn, connectMySQL,
  mssqlConn, setMssqlConn, connectMssql,
  loadDemoSchema, status,
}: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-3" data-wt="db-connect">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map(({ id, label, icon }) => {
          const active = dbSource === id;
          return (
            <button key={id} onClick={() => setDbSource(id)}
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-150"
              style={{
                borderColor:  active ? ACCENT : "var(--border)",
                color:        active ? ACCENT : "var(--text3)",
                background:   active ? "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12))" : "transparent",
                boxShadow:    active ? "0 0 12px rgba(99,102,241,0.15)" : "none",
              }}>
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {dbSource === "demo" && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-[var(--text2)]">Chinook music store</p>
            <p className="text-[10px] text-[var(--text3)]">11 tables · ~3.5k rows</p>
          </div>
          <button onClick={loadDemoSchema}
            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Load Schema
          </button>
        </div>
      )}

      {dbSource === "upload" && (
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-xs text-[var(--text2)]">.db · .sqlite · .duckdb · .parquet · .csv</span>
          <input type="file" accept=".db,.sqlite,.sqlite3,.duckdb,.parquet,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadDb(f); }} />
          <span className="text-xs px-3 py-1.5 rounded-lg text-white shrink-0 font-medium"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Choose File
          </span>
        </label>
      )}

      {(dbSource === "postgres" || dbSource === "mysql" || dbSource === "mssql") && (
        <div className="flex gap-2">
          <input
            value={dbSource === "postgres" ? pgConn : dbSource === "mysql" ? mysqlConn : mssqlConn}
            onChange={e => dbSource === "postgres" ? setPgConn(e.target.value) : dbSource === "mysql" ? setMysqlConn(e.target.value) : setMssqlConn(e.target.value)}
            placeholder={dbSource === "postgres" ? "postgresql://user:pass@host:5432/db" : dbSource === "mysql" ? "mysql://user:pass@host:3306/db" : "mssql://user:pass@host:1433/db"}
            className="flex-1 text-xs bg-[var(--bg-glass)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:border-indigo-500/40 transition-colors"/>
          <button onClick={dbSource === "postgres" ? connectPg : dbSource === "mysql" ? connectMySQL : connectMssql}
            className="text-xs px-3 py-1.5 rounded-lg text-white shrink-0 font-medium"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            Connect
          </button>
        </div>
      )}

      {status && (
        <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: ACCENT }}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
          {status}
        </p>
      )}
    </div>
  );
}