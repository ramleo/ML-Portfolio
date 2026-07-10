"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ML_SQL_API } from "@/config/urls";
import DbConnectPanel, { type DbSource } from "./DbConnectPanel";
import QueryResultPanel from "./QueryResultPanel";
import SchemaDiagram from "./SchemaDiagram";
import MobileSidebar from "./MobileSidebar";
import SchemaPanel from "./SchemaPanel";
import QueryHistoryPanel from "./QueryHistoryPanel";
import PipelineStatus from "./PipelineStatus";
import DesktopSidebar from "./DesktopSidebar";

const ACCENT = "#6366f1";

const SAMPLE_QUESTIONS = [
  "Show me the top 5 artists by total album count",
  "What is the total revenue for each year?",
  "Show the top 6 genres by number of tracks",
  "List the top 10 customers by total spending",
  "What is the average track length in milliseconds vs average unit price per genre?",
];

type Provider = "groq" | "gemini" | "cohere";

interface HistoryTurn {
  question: string;
  sql: string;
  result_summary: string;
  count: number;
  timestamp?: number;
}

interface FKRel { from_col: string; to_table: string; to_col: string; }
interface SchemaTable { columns: { name: string; type: string; pk: boolean }[]; row_count: number; foreign_keys?: FKRel[]; }

export default function TextToSqlRunner() {
  const [dbSource, setDbSource] = useState<DbSource>("demo");
  const [dbRef, setDbRef]       = useState("chinook");
  const [pgConn, setPgConn]     = useState("");
  const [mysqlConn, setMysqlConn] = useState("");
  const [mssqlConn, setMssqlConn] = useState("");
  const [schema, setSchema]     = useState<Record<string, SchemaTable> | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [question, setQuestion] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("q") ?? ""; } catch { return ""; }
  });
  const [provider, setProvider] = useState<Provider>("groq");

  const [running, setRunning]         = useState(false);
  const [status, setStatus]           = useState("");
  const [retryMsg, setRetryMsg]       = useState("");
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [results, setResults]         = useState<{ columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number } | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [history, setHistory]         = useState<HistoryTurn[]>([]);
  const [glossary, setGlossary]       = useState("");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(-1);

  const [fewShot, setFewShot]         = useState<HistoryTurn[]>([]);
  useEffect(() => { try { const s = localStorage.getItem("ml_sql_fewshot"); if (s) setFewShot(JSON.parse(s)); } catch {} }, []);
  const [dynQ, setDynQ] = useState(SAMPLE_QUESTIONS);
  useEffect(() => {
    if (dbRef === "chinook") { setDynQ(SAMPLE_QUESTIONS); return; }
    fetch(`${ML_SQL_API}/sql/sample-questions?db_ref=${dbRef}&provider=${provider}`)
      .then(r => r.json()).then(d => { if (d.questions?.length) setDynQ(d.questions); }).catch(() => {});
  }, [dbRef, provider]);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const readerRef     = useRef<ReadableStreamDefaultReader | null>(null);
  const questionRef   = useRef<HTMLTextAreaElement | null>(null);
  const currentSqlRef  = useRef<string | null>(null);
  const originalSqlRef = useRef<string | null>(null);

  const loadDemoSchema = useCallback(async () => {
    setStatus("Loading Chinook schema…");
    try {
      const res = await fetch(`${ML_SQL_API}/sql/schema?db_ref=chinook`);
      const data = await res.json().catch(() => { throw new Error("Backend warming up — wait 30s and click Load Schema again."); });
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSchema(data.tables); setDbRef("chinook"); setStatus("");
    } catch (e: unknown) { setStatus((e as Error).message); }
  }, []);

  useEffect(() => { loadDemoSchema(); }, [loadDemoSchema]);

  const uploadDb = useCallback(async (file: File) => {
    setStatus("Uploading…");
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch(`${ML_SQL_API}/sql/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.schema.tables); setDbRef(data.db_ref);
      setStatus(`Loaded: ${Object.keys(data.schema.tables).length} tables`);
    } catch (e: unknown) { setStatus(`Upload failed: ${(e as Error).message}`); }
  }, []);

  const connectRemote = useCallback(async (connStr: string, dbType: "postgresql" | "mysql" | "mssql") => {
    if (!connStr.trim()) return;
    setStatus(`Connecting to ${dbType === "mysql" ? "MySQL" : "PostgreSQL"}…`);
    try {
      const res  = await fetch(`${ML_SQL_API}/sql/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conn_str: connStr, db_type: dbType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.schema.tables); setDbRef(data.db_ref);
      setStatus(`Connected: ${Object.keys(data.schema.tables).length} tables`);
    } catch (e: unknown) { setStatus(`Connection failed: ${(e as Error).message}`); }
  }, []);

  const runQuery = useCallback(async (questionOverride?: string) => {
    const activeQ = questionOverride ?? question;
    if (!activeQ.trim() || running) return;
    readerRef.current?.cancel();
    setRunning(true); setError(null); setGeneratedSql(null);
    setResults(null); setRetryMsg(""); setStatus("Sending query…");
    setCurrentPage(1); setTotalCount(-1); currentSqlRef.current = null; originalSqlRef.current = null; setActiveFilter(null);

    const fewShotPayload = fewShot.slice(-3).map(t => ({
      question: t.question, sql: t.sql, result_summary: `Example. ${t.result_summary}`,
    }));
    const historyPayload = [
      ...fewShotPayload,
      ...history.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: t.result_summary })),
    ];

    let finalSql = "";
    let finalResults: { columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number } | null = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: activeQ, provider, db_ref: dbRef, history: historyPayload, glossary }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "schema_loaded")  setStatus(`Schema: ${evt.tables} tables`);
            else if (evt.type === "retry")     setRetryMsg(`Retrying (${evt.attempt}/3): ${/429|Too Many Requests/i.test(evt.error??'') ? "Rate limit reached — switch provider or wait ~60s" : (evt.error??'')}`);
            else if (evt.type === "sql_generated") { finalSql = evt.sql; setGeneratedSql(evt.sql); currentSqlRef.current = evt.sql; originalSqlRef.current = evt.sql; setStatus("Executing…"); }
            else if (evt.type === "results")   { finalResults = evt; setResults(evt); setTotalCount(evt.total_count ?? -1); setStatus(`${evt.count} rows in ${evt.exec_time_ms}ms`); }
            else if (evt.type === "error")       setError(evt.text);
            else if (evt.type === "done")        setRunning(false);
          } catch { /* ignore malformed */ }
        }
      }
      if (finalSql && finalResults) {
        const cols = finalResults.columns.join(", ");
        const sample = finalResults.rows.slice(0, 2).map(r => `[${(r as unknown[]).join(", ")}]`).join("; ");
        const summary = `${finalResults.count} rows. Columns: ${cols}${sample ? `. Sample: ${sample}` : ""}`;
        const newTurn: HistoryTurn = { question: activeQ, sql: finalSql, result_summary: summary, count: finalResults.count, timestamp: Date.now() };
        setHistory(prev => [...prev, newTurn]);
        try {
          const prev = JSON.parse(localStorage.getItem("ml_sql_fewshot") || "[]") as HistoryTurn[];
          const updated = [...prev, newTurn].slice(-20);
          localStorage.setItem("ml_sql_fewshot", JSON.stringify(updated));
          setFewShot(updated);
        } catch { /* ignore */ }
      }
    } catch (e: unknown) {
      setError((e as Error).name === "AbortError" ? "Backend is waking up — wait 30 seconds and try again." : (e as Error).message);
    } finally { clearTimeout(timeoutId); setRunning(false); }
  }, [question, provider, dbRef, running, history]);
  const runDirectSQL = useCallback(async (sql: string) => {
    setError(null);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/page`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db_ref: dbRef, page: 1, page_size: 50 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResults(data); setCurrentPage(1); setTotalCount(data.total_count ?? -1);
      setGeneratedSql(sql); currentSqlRef.current = sql; originalSqlRef.current = sql;
    } catch (e: unknown) { setError(`Execution failed: ${(e as Error).message}`); }
  }, [dbRef]);

  const copySQL = useCallback(() => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }, [generatedSql]);
  const changePage = useCallback(async (page: number) => {
    if (!currentSqlRef.current) return;
    const res = await fetch(`${ML_SQL_API}/sql/page`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: currentSqlRef.current, db_ref: dbRef, page, page_size: 50 }),
    });
    const data = await res.json();
    if (!data.error) { setResults(data); setCurrentPage(page); }
  }, [dbRef]);

  const filterResults = useCallback(async (filterText: string) => {
    if (!currentSqlRef.current || !results) return;
    try {
      const res = await fetch(`${ML_SQL_API}/sql/filter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: currentSqlRef.current, db_ref: dbRef, filter_text: filterText, columns: results.columns, provider }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResults(data); setCurrentPage(1); setTotalCount(data.total_count ?? -1);
      currentSqlRef.current = data.filtered_sql;
      setActiveFilter(filterText);
    } catch (e: unknown) { setError(`Filter failed: ${(e as Error).message}`); }
  }, [dbRef, results, provider]);

  const clearFilter = useCallback(async () => {
    if (!originalSqlRef.current) return;
    currentSqlRef.current = originalSqlRef.current;
    setActiveFilter(null);
    await changePage(1);
  }, [changePage]);

  const schemaPanel = <SchemaPanel schema={schema} accent={ACCENT} />;

  const shareQuery = useCallback(() => {
    const url = `${window.location.origin}/tools/text-to-sql?q=${encodeURIComponent(question)}`;
    navigator.clipboard.writeText(url);
    setShared(true); setTimeout(() => setShared(false), 2000);
  }, [question]);

  return (
    <div className="relative">
    {diagramOpen && schema && (
      <SchemaDiagram schema={schema} onClose={() => setDiagramOpen(false)} />
    )}

    <MobileSidebar
      open={mobileSidebar} onClose={() => setMobileSidebar(false)}
      hasSchema={!!schema} schemaPanel={schemaPanel}
      sampleQuestions={dynQ} onQuestion={setQuestion}
      glossary={glossary} onGlossaryChange={setGlossary}
      onOpenDiagram={() => setDiagramOpen(true)}
    />

    <div className="flex gap-4 w-full max-w-7xl mx-auto px-4 pb-16">
      <DesktopSidebar
        schemaOpen={schemaOpen} onToggleSchema={() => setSchemaOpen(o => !o)}
        schema={schema} onOpenDiagram={() => setDiagramOpen(true)}
        schemaPanel={schemaPanel} sampleQuestions={dynQ} onSelectQuestion={setQuestion}
        glossary={glossary} onGlossaryChange={setGlossary}
        glossaryOpen={glossaryOpen} onToggleGlossary={() => setGlossaryOpen(o => !o)}
        currentQuery={generatedSql ? { question, sql: generatedSql } : null}
        onLoadSaved={setQuestion}
      />

      <div className="flex-1 flex flex-col gap-4 min-w-0 pt-2">
        <DbConnectPanel
          dbSource={dbSource} setDbSource={setDbSource}
          uploadDb={uploadDb}
          pgConn={pgConn} setPgConn={setPgConn} connectPg={() => connectRemote(pgConn, "postgresql")}
          mysqlConn={mysqlConn} setMysqlConn={setMysqlConn} connectMySQL={() => connectRemote(mysqlConn, "mysql")}
          mssqlConn={mssqlConn} setMssqlConn={setMssqlConn} connectMssql={() => connectRemote(mssqlConn, "mssql")}
          loadDemoSchema={loadDemoSchema}
          status={status}
        />

        <div className="lg:hidden flex gap-2">
          <button onClick={() => setMobileSidebar(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-white transition-colors shrink-0">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="4" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="8" width="10" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="12" width="12" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
            Schema &amp; Tools
          </button>
          {schema && (
            <button onClick={() => setDiagramOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400 hover:text-white hover:border-indigo-500/50 transition-colors">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="10" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6 3h4M8 5v6M6 13h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              View Diagram
            </button>
          )}
        </div>

        <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300 ${running ? "border-indigo-500/40 bg-indigo-950/20 shadow-[0_0_24px_rgba(99,102,241,0.08)]" : "border-white/10 bg-white/5"}`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <textarea ref={questionRef} value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runQuery(); } }}
                placeholder={results ? "Ask a follow-up or new question… (Enter to run)" : "Ask a question about your data… (Enter to run)"}
                rows={2}
                className="w-full text-sm bg-black/30 border border-white/10 focus:border-indigo-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] rounded-lg px-3 py-2 pr-7 text-gray-200 placeholder-gray-600 outline-none resize-none transition-all duration-200" />
              {question && (
                <button onClick={() => setQuestion("")} title="Clear"
                  className="absolute top-2 right-2 text-gray-600 hover:text-gray-300 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <select value={provider} onChange={e => setProvider(e.target.value as Provider)}
                className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-gray-300 outline-none">
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="cohere">Cohere</option>
              </select>
              <button onClick={() => runQuery()} disabled={running || !question.trim() || !schema}
                className={`text-xs px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-40 transition-all ${running ? "opacity-80" : "hover:brightness-110"}`}
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                {running ? "Running…" : !schema ? "Load DB" : "Ask"}
              </button>
              <button onClick={() => { const sq = dynQ[Math.floor(Math.random() * dynQ.length)]; setQuestion(sq); runQuery(sq); }} disabled={running || !schema} className="text-[11px] px-4 py-1.5 rounded-lg border border-indigo-500/25 text-indigo-300/60 hover:text-indigo-200 hover:border-indigo-500/40 disabled:opacity-40 transition-all">Surprise me</button>
            </div>
          </div>
          <PipelineStatus running={running} retryMsg={retryMsg} hasSql={!!generatedSql} hasResults={!!results} hasExplanation={false} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-gray-600">SQL is AI-generated — accuracy depends on the LLM. Verify results before use.</p>
            {generatedSql && dbRef === "chinook" && (
              <button onClick={shareQuery} className="text-[10px] shrink-0 transition-colors" style={{ color: shared ? "#10b981" : "#6b7280" }}>
                {shared ? "✓ Link copied!" : "Share this query"}</button>)}
          </div>
        </div>
        {history.length > 0 && <QueryHistoryPanel history={history} onClear={() => setHistory([])} onReuse={setQuestion} />}
        <QueryResultPanel
          generatedSql={generatedSql} copied={copied} copySQL={copySQL} question={question}
          results={results} error={error}
          onRetry={runQuery} provider={provider}
          currentPage={currentPage} totalCount={totalCount} pageSize={50}
          onPageChange={changePage}
          onFilter={filterResults} onClearFilter={clearFilter} filterActive={!!activeFilter}
          onRunSQL={runDirectSQL}
        />
        {results && !running && (
          <button onClick={() => { questionRef.current?.scrollIntoView({behavior:"smooth",block:"center"}); questionRef.current?.focus(); }}
            className="text-[11px] text-gray-600 hover:text-indigo-400 transition-colors mx-auto flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M9 2H4a2 2 0 00-2 2v2M3 8L1 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Ask a follow-up — this query&apos;s context is retained</button>
        )}
      </div>
    </div>
    </div>
  );
}