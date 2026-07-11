"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ML_SQL_API } from "@/config/urls";
import DbConnectPanel, { type DbSource } from "./DbConnectPanel";
import QueryResultPanel from "./QueryResultPanel";
import SchemaDiagram from "./SchemaDiagram";
import MobileSidebar from "./MobileSidebar";
import SchemaPanel from "./SchemaPanel";
import QueryHistoryPanel from "./QueryHistoryPanel";
import DesktopSidebar from "./DesktopSidebar";
import QuestionInput from "./QuestionInput";

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
  question: string; sql: string; result_summary: string; count: number; timestamp?: number;
}
interface FKRel { from_col: string; to_table: string; to_col: string; }
interface SchemaTable { columns: { name: string; type: string; pk: boolean }[]; row_count: number; foreign_keys?: FKRel[]; }
type Results = { columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number };

interface ResultTab {
  id: string;
  question: string;
  sql: string | null;
  currentSql: string | null;
  originalSql: string | null;
  results: Results | null;
  error: string | null;
  currentPage: number;
  totalCount: number;
  activeFilter: string | null;
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
  const [running, setRunning]   = useState(false);
  const [status, setStatus]     = useState("");
  const [retryMsg, setRetryMsg] = useState("");
  const [copied, setCopied]     = useState(false);
  const [history, setHistory]   = useState<HistoryTurn[]>([]);
  const [glossary, setGlossary] = useState("");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [shared, setShared]     = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [tabs, setTabs]         = useState<ResultTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  const [fewShot, setFewShot] = useState<HistoryTurn[]>([]);
  useEffect(() => { try { const s = localStorage.getItem("ml_sql_fewshot"); if (s) setFewShot(JSON.parse(s)); } catch {} }, []);
  const [dynQ, setDynQ] = useState(SAMPLE_QUESTIONS);
  useEffect(() => {
    if (dbRef === "chinook") { setDynQ(SAMPLE_QUESTIONS); return; }
    fetch(`${ML_SQL_API}/sql/sample-questions?db_ref=${dbRef}&provider=${provider}`)
      .then(r => r.json()).then(d => { if (d.questions?.length) setDynQ(d.questions); }).catch(() => {});
  }, [dbRef, provider]);

  const readerRef   = useRef<ReadableStreamDefaultReader | null>(null);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);

  const patchTab = useCallback((id: string, patch: Partial<ResultTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabId) setActiveTabId(next[next.length - 1]?.id ?? null);
      return next;
    });
  }, [activeTabId]);

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
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/upload`, { method: "POST", body: form });
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
      const res = await fetch(`${ML_SQL_API}/sql/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conn_str: connStr, db_type: dbType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.tables); setDbRef(data.db_ref);
      setStatus(`Connected: ${Object.keys(data.tables).length} tables`);
    } catch (e: unknown) { setStatus(`Connection failed: ${(e as Error).message}`); }
  }, []);

  const runQuery = useCallback(async (questionOverride?: string) => {
    const activeQ = questionOverride ?? question;
    if (!activeQ.trim() || running) return;
    readerRef.current?.cancel();

    const tabId = Date.now().toString();
    const newTab: ResultTab = { id: tabId, question: activeQ, sql: null, currentSql: null, originalSql: null, results: null, error: null, currentPage: 1, totalCount: -1, activeFilter: null };
    setTabs(prev => [...prev.slice(-4), newTab]);
    setActiveTabId(tabId);
    setRunning(true); setRetryMsg(""); setStatus("Sending query…");

    const fewShotPayload = fewShot.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: `Example. ${t.result_summary}` }));
    const historyPayload = [...fewShotPayload, ...history.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: t.result_summary }))];

    let finalSql = ""; let finalResults: Results | null = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: activeQ, provider, db_ref: dbRef, history: historyPayload, glossary }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader(); readerRef.current = reader;
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "schema_loaded")  setStatus(`Schema: ${evt.tables} tables`);
            else if (evt.type === "retry")     setRetryMsg(`Retrying (${evt.attempt}/3): ${/429|Too Many Requests/i.test(evt.error??'') ? "Rate limit reached — switch provider or wait ~60s" : (evt.error??'')}`);
            else if (evt.type === "sql_generated") {
              finalSql = evt.sql;
              patchTab(tabId, { sql: evt.sql, currentSql: evt.sql, originalSql: evt.sql });
              setStatus("Executing…");
            }
            else if (evt.type === "results") {
              finalResults = evt;
              patchTab(tabId, { results: evt, totalCount: evt.total_count ?? -1 });
              setStatus(`${evt.count} rows in ${evt.exec_time_ms}ms`);
              const sid = (typeof window !== "undefined" && localStorage.getItem("_ml_session")) ?? "";
              fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "query_run", path: "/tools/text-to-sql", session_id: sid, meta: { rows: evt.count, provider } }),
              }).catch(() => {});
            }
            else if (evt.type === "error") patchTab(tabId, { error: evt.text });
            else if (evt.type === "done")  setRunning(false);
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
      patchTab(tabId, { error: (e as Error).name === "AbortError" ? "Backend is waking up — wait 30 seconds and try again." : (e as Error).message });
    } finally { clearTimeout(timeoutId); setRunning(false); }
  }, [question, provider, dbRef, running, history, fewShot, glossary, patchTab]);

  const runDirectSQL = useCallback(async (sql: string) => {
    if (!activeTabId) return;
    const tabId = activeTabId;
    try {
      const res = await fetch(`${ML_SQL_API}/sql/page`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db_ref: dbRef, page: 1, page_size: 50 }),
      });
      const data = await res.json();
      if (data.error) { patchTab(tabId, { error: data.error }); return; }
      patchTab(tabId, { sql, currentSql: sql, originalSql: sql, results: data, currentPage: 1, totalCount: data.total_count ?? -1, error: null });
    } catch (e: unknown) { patchTab(activeTabId, { error: `Execution failed: ${(e as Error).message}` }); }
  }, [activeTabId, dbRef, patchTab]);

  const copySQL = useCallback(() => {
    if (!activeTab?.sql) return;
    navigator.clipboard.writeText(activeTab.sql);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }, [activeTab]);

  const changePage = useCallback(async (page: number) => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.currentSql) return;
    const { id: tabId, currentSql } = tab;
    const res = await fetch(`${ML_SQL_API}/sql/page`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: currentSql, db_ref: dbRef, page, page_size: 50 }),
    });
    const data = await res.json();
    if (!data.error) patchTab(tabId, { results: data, currentPage: page });
  }, [tabs, activeTabId, dbRef, patchTab]);

  const filterResults = useCallback(async (filterText: string) => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.currentSql || !tab.results) return;
    const { id: tabId, currentSql, results: tabResults } = tab;
    try {
      const res = await fetch(`${ML_SQL_API}/sql/filter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: currentSql, db_ref: dbRef, filter_text: filterText, columns: tabResults.columns, provider }),
      });
      const data = await res.json();
      if (data.error) { patchTab(tabId, { error: data.error }); return; }
      patchTab(tabId, { results: data, currentPage: 1, totalCount: data.total_count ?? -1, currentSql: data.filtered_sql, activeFilter: filterText });
    } catch (e: unknown) { patchTab(tabId, { error: `Filter failed: ${(e as Error).message}` }); }
  }, [tabs, activeTabId, dbRef, provider, patchTab]);

  const clearFilter = useCallback(async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.originalSql) return;
    const { id: tabId, originalSql } = tab;
    const res = await fetch(`${ML_SQL_API}/sql/page`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: originalSql, db_ref: dbRef, page: 1, page_size: 50 }),
    });
    const data = await res.json();
    if (!data.error) patchTab(tabId, { currentSql: originalSql, activeFilter: null, results: data, currentPage: 1 });
  }, [tabs, activeTabId, dbRef, patchTab]);

  const shareQuery = useCallback(() => {
    const url = `${window.location.origin}/tools/text-to-sql?q=${encodeURIComponent(question)}`;
    navigator.clipboard.writeText(url);
    setShared(true); setTimeout(() => setShared(false), 2000);
  }, [question]);

  const schemaPanel = <SchemaPanel schema={schema} accent={ACCENT} />;

  return (
    <div className="relative">
      {diagramOpen && schema && <SchemaDiagram schema={schema} onClose={() => setDiagramOpen(false)} />}
      <MobileSidebar open={mobileSidebar} onClose={() => setMobileSidebar(false)}
        hasSchema={!!schema} schemaPanel={schemaPanel}
        sampleQuestions={dynQ} onQuestion={setQuestion}
        glossary={glossary} onGlossaryChange={setGlossary}
        onOpenDiagram={() => setDiagramOpen(true)} />

      <div className="flex gap-4 w-full max-w-7xl mx-auto px-4 pb-16">
        <DesktopSidebar
          schemaOpen={schemaOpen} onToggleSchema={() => setSchemaOpen(o => !o)}
          schema={schema} onOpenDiagram={() => setDiagramOpen(true)}
          schemaPanel={schemaPanel} sampleQuestions={dynQ} onSelectQuestion={setQuestion}
          glossary={glossary} onGlossaryChange={setGlossary}
          glossaryOpen={glossaryOpen} onToggleGlossary={() => setGlossaryOpen(o => !o)}
          currentQuery={activeTab?.sql ? { question: activeTab.question, sql: activeTab.sql } : null}
          onLoadSaved={setQuestion} />

        <div className="flex-1 flex flex-col gap-4 min-w-0 pt-2">
          <DbConnectPanel
            dbSource={dbSource} setDbSource={setDbSource} uploadDb={uploadDb}
            pgConn={pgConn} setPgConn={setPgConn} connectPg={() => connectRemote(pgConn, "postgresql")}
            mysqlConn={mysqlConn} setMysqlConn={setMysqlConn} connectMySQL={() => connectRemote(mysqlConn, "mysql")}
            mssqlConn={mssqlConn} setMssqlConn={setMssqlConn} connectMssql={() => connectRemote(mssqlConn, "mssql")}
            loadDemoSchema={loadDemoSchema} status={status} />

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

          <QuestionInput
            questionRef={questionRef} question={question} onQuestionChange={setQuestion}
            onSubmit={runQuery} provider={provider} onProviderChange={setProvider}
            running={running} schema={schema}
            onSurprise={() => { const sq = dynQ[Math.floor(Math.random() * dynQ.length)]; setQuestion(sq); runQuery(sq); }}
            retryMsg={retryMsg} hasSql={!!activeTab?.sql} hasResults={!!activeTab?.results}
            shared={shared} onShare={shareQuery} canShare={dbRef === "chinook"} />

          {history.length > 0 && <QueryHistoryPanel history={history} onClear={() => setHistory([])} onReuse={setQuestion} />}

          {tabs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {tabs.map((tab, i) => (
                <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 cursor-pointer transition-all ${
                    tab.id === activeTabId
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                      : "border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15"
                  }`}>
                  <span className="text-[9px] text-gray-600">{i + 1}</span>
                  <span className="max-w-[130px] truncate">{tab.question || "Query"}</span>
                  {tab.results && <span className="text-[9px] text-gray-600 ml-0.5">{tab.results.count}r</span>}
                  <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <QueryResultPanel
            generatedSql={activeTab?.sql ?? null} copied={copied} copySQL={copySQL}
            question={activeTab?.question ?? question}
            results={activeTab?.results ?? null} error={activeTab?.error ?? null}
            onRetry={runQuery} provider={provider}
            currentPage={activeTab?.currentPage ?? 1} totalCount={activeTab?.totalCount ?? -1} pageSize={50}
            onPageChange={changePage} onFilter={filterResults} onClearFilter={clearFilter}
            filterActive={!!activeTab?.activeFilter} onRunSQL={runDirectSQL}
            onSuggest={q => { setQuestion(q); runQuery(q); }} />

          {activeTab?.results && !running && (
            <button onClick={() => { questionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); questionRef.current?.focus(); }}
              className="text-[11px] text-gray-600 hover:text-indigo-400 transition-colors mx-auto flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M9 2H4a2 2 0 00-2 2v2M3 8L1 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ask a follow-up — this query&apos;s context is retained
            </button>
          )}
        </div>
      </div>
    </div>
  );
}