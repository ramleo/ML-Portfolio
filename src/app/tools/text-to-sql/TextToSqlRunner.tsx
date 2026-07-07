"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ML_SQL_API } from "@/config/urls";
import DbConnectPanel, { type DbSource } from "./DbConnectPanel";
import QueryResultPanel from "./QueryResultPanel";
import SchemaDiagram from "./SchemaDiagram";
import MobileSidebar from "./MobileSidebar";
import SchemaPanel from "./SchemaPanel";

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
}

interface FKRel { from_col: string; to_table: string; to_col: string; }
interface SchemaTable { columns: { name: string; type: string; pk: boolean }[]; row_count: number; foreign_keys?: FKRel[]; }
interface Viz {
  chart_type: string; labels?: string[]; values?: number[];
  x_label: string; y_label: string; x?: number[]; y?: number[];
  value?: string; label?: string; series?: { name: string; values: number[] }[];
}

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
  const [viz, setViz]                 = useState<Viz | null>(null);
  const [explanation, setExplanation] = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [history, setHistory]         = useState<HistoryTurn[]>([]);
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);
  const [glossary, setGlossary]       = useState("");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(-1);

  // Load few-shot examples from localStorage on mount
  const [fewShot, setFewShot]         = useState<HistoryTurn[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ml_sql_fewshot");
      if (stored) setFewShot(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const readerRef    = useRef<ReadableStreamDefaultReader | null>(null);
  const questionRef  = useRef<HTMLTextAreaElement | null>(null);
  const currentSqlRef = useRef<string | null>(null);

  const loadDemoSchema = useCallback(async () => {
    setStatus("Loading Chinook schema…");
    try {
      const res  = await fetch(`${ML_SQL_API}/sql/schema?db_ref=chinook`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.tables); setDbRef("chinook"); setStatus("");
    } catch (e: unknown) { setStatus(`Schema load failed: ${(e as Error).message}`); }
  }, []);

  // Auto-load Chinook schema on mount so schema panel + diagram are ready immediately
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

  const runQuery = useCallback(async () => {
    if (!question.trim() || running) return;
    readerRef.current?.cancel();
    setRunning(true); setError(null); setGeneratedSql(null);
    setResults(null); setViz(null); setExplanation(""); setRetryMsg(""); setStatus("Sending query…");
    setCurrentPage(1); setTotalCount(-1); currentSqlRef.current = null;

    // Combine few-shot examples (from localStorage) + recent conversation turns
    const fewShotPayload = fewShot.slice(-3).map(t => ({
      question: t.question, sql: t.sql, result_summary: `Example. ${t.result_summary}`,
    }));
    const historyPayload = [
      ...fewShotPayload,
      ...history.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: t.result_summary })),
    ];

    let finalSql = "";
    let finalResults: { columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number } | null = null;

    try {
      const res = await fetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, provider, db_ref: dbRef, history: historyPayload, glossary }),
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
            else if (evt.type === "retry")     setRetryMsg(`Retrying (${evt.attempt}/3): ${evt.error}`);
            else if (evt.type === "sql_generated") { finalSql = evt.sql; setGeneratedSql(evt.sql); currentSqlRef.current = evt.sql; setStatus("Executing…"); }
            else if (evt.type === "results")   { finalResults = evt; setResults(evt); setTotalCount(evt.total_count ?? -1); setStatus(`${evt.count} rows in ${evt.exec_time_ms}ms`); }
            else if (evt.type === "visualization") setViz(evt);
            else if (evt.type === "token")     setExplanation(prev => prev + evt.text);
            else if (evt.type === "error")     setError(evt.text);
            else if (evt.type === "done")      setRunning(false);
          } catch { /* ignore malformed */ }
        }
      }
      if (finalSql && finalResults) {
        const cols = finalResults.columns.join(", ");
        const sample = finalResults.rows.slice(0, 2).map(r => `[${(r as unknown[]).join(", ")}]`).join("; ");
        const summary = `${finalResults.count} rows. Columns: ${cols}${sample ? `. Sample: ${sample}` : ""}`;
        const newTurn: HistoryTurn = { question, sql: finalSql, result_summary: summary, count: finalResults.count };
        setHistory(prev => [...prev, newTurn]);
        // Persist to localStorage for future-session few-shot
        try {
          const prev = JSON.parse(localStorage.getItem("ml_sql_fewshot") || "[]") as HistoryTurn[];
          const updated = [...prev, newTurn].slice(-20);
          localStorage.setItem("ml_sql_fewshot", JSON.stringify(updated));
          setFewShot(updated);
        } catch { /* ignore */ }
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setRunning(false); }
  }, [question, provider, dbRef, running, history]);

  const drillDown = useCallback((label: string, colName: string) => {
    setQuestion(`Show me details where ${colName} is "${label}"`);
    setTimeout(() => {
      questionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      questionRef.current?.focus();
    }, 50);
  }, []);

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
      sampleQuestions={SAMPLE_QUESTIONS} onQuestion={setQuestion}
      glossary={glossary} onGlossaryChange={setGlossary}
      onOpenDiagram={() => setDiagramOpen(true)}
    />

    <div className="flex gap-4 w-full max-w-7xl mx-auto px-4 pb-16">
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-3 pt-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center mb-2">
            <button onClick={() => setSchemaOpen(o => !o)}
              className="text-xs font-semibold text-gray-300 flex items-center gap-1 flex-1">
              <span>{schemaOpen ? "▾" : "▸"}</span> Schema
              {schema && <span className="ml-1 text-[10px] text-gray-500">{Object.keys(schema).length} tables</span>}
            </button>
          </div>
          {schema && (
            <button onClick={() => setDiagramOpen(true)}
              className="w-full mb-2 flex items-center justify-center gap-1.5 text-[11px] py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-indigo-500/50 transition-colors">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="10" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6 3h4M8 5v6M6 13h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              View Diagram
            </button>
          )}
          {schemaOpen && schemaPanel}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Sample Questions</p>
          {SAMPLE_QUESTIONS.map(q => (
            <button key={q} onClick={() => setQuestion(q)}
              className="text-[10px] text-left text-gray-400 hover:text-white w-full py-0.5 hover:pl-1 transition-all">
              › {q}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <button onClick={() => setGlossaryOpen(o => !o)}
            className="text-[10px] font-semibold text-gray-400 mb-1 flex items-center gap-1 w-full uppercase tracking-wide">
            <span>{glossaryOpen ? "▾" : "▸"}</span> Glossary
          </button>
          {glossaryOpen && (
            <>
              <textarea value={glossary} onChange={e => setGlossary(e.target.value)}
                placeholder={"revenue: sum of invoice totals\nLTV: lifetime value of customer"}
                rows={5}
                className="w-full text-[10px] font-mono bg-black/30 border border-white/10 rounded px-2 py-1.5 text-gray-300 placeholder-gray-600 outline-none resize-none mt-1" />
              <p className="text-[9px] text-gray-600 mt-1">Definitions injected into every SQL prompt</p>
            </>
          )}
        </div>
      </aside>

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

        {/* Mobile bar — Schema drawer + Diagram, hidden on desktop */}
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

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea ref={questionRef} value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runQuery(); } }}
              placeholder="Ask a question about your data… (Enter to run)"
              rows={2}
              className="flex-1 text-sm bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 outline-none resize-none" />
            <div className="flex flex-col gap-2 shrink-0">
              <select value={provider} onChange={e => setProvider(e.target.value as Provider)}
                className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-gray-300 outline-none">
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="cohere">Cohere</option>
              </select>
              <button onClick={runQuery} disabled={running || !question.trim()}
                className="text-xs px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-40 transition-opacity"
                style={{ background: ACCENT }}>
                {running ? "Running…" : "Ask"}
              </button>
            </div>
          </div>
          {retryMsg && <p className="text-[11px] text-yellow-400">{retryMsg}</p>}
          {generatedSql && dbRef === "chinook" && (
            <button onClick={shareQuery} className="text-[10px] self-start transition-colors" style={{ color: shared ? "#10b981" : "#6b7280" }}>
              {shared ? "✓ Link copied!" : "Share this query"}
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Conversation ({history.length} {history.length === 1 ? "turn" : "turns"})
              </span>
              <button onClick={() => { setHistory([]); setExpandedTurn(null); }}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {history.map((turn, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-black/20 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedTurn(expandedTurn === i ? null : i)}>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: ACCENT }}>Q{i + 1}</span>
                    <span className="text-[11px] text-gray-300 truncate flex-1">{turn.question}</span>
                    <span className="text-[10px] text-gray-500 shrink-0">{turn.count} rows</span>
                    <span className="text-[10px] text-gray-600">{expandedTurn === i ? "▲" : "▼"}</span>
                  </button>
                  {expandedTurn === i && (
                    <pre className="px-3 pb-2 text-[10px] font-mono text-green-300/80 whitespace-pre-wrap border-t border-white/5 pt-1.5">
                      {turn.sql}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <QueryResultPanel
          generatedSql={generatedSql} copied={copied} copySQL={copySQL} question={question}
          results={results} viz={viz} explanation={explanation} error={error}
          onDrillDown={drillDown}
          currentPage={currentPage} totalCount={totalCount} pageSize={50}
          onPageChange={changePage}
        />
      </div>
    </div>
    </div>
  );
}