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
import TabBar from "./TabBar";
import WalkthroughTooltip from "./WalkthroughTooltip";
import type { Provider, HistoryTurn, SchemaTable, Results, ResultTab } from "./_types";
import { getCorrection } from "./_corrections";
import { SAMPLE_QUESTIONS } from "./_types";

const ACCENT = "#6366f1";

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
  const [hydrated, setHydrated] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const tabsRef = useRef<ResultTab[]>(tabs);
  tabsRef.current = tabs;

  // Restore from sessionStorage after mount (avoids SSR/CSR hydration mismatch)
  useEffect(() => {
    try {
      const s = sessionStorage.getItem("ml_sql_tabs");
      if (s) setTabs(JSON.parse(s));
      setActiveTabId(sessionStorage.getItem("ml_sql_active_tab") ?? null);
    } catch {}
    setHydrated(true);
  }, []);

  // Persist tabs (only after hydration to avoid wiping sessionStorage on mount)
  useEffect(() => { if (!hydrated) return; try { sessionStorage.setItem("ml_sql_tabs", JSON.stringify(tabs)); } catch {} }, [tabs, hydrated]);
  useEffect(() => { if (!hydrated) return; try { if (activeTabId) sessionStorage.setItem("ml_sql_active_tab", activeTabId); else sessionStorage.removeItem("ml_sql_active_tab"); } catch {} }, [activeTabId, hydrated]);

  // Sync question input to active tab's question when switching tabs
  useEffect(() => {
    const tab = tabsRef.current.find(t => t.id === activeTabId);
    if (tab?.question) setQuestion(tab.question);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Clear glossary when switching databases — old glossary terms don't apply to new schema
  useEffect(() => { setGlossary(""); }, [dbRef]);

  const runQueryRef = useRef<(() => void) | null>(null);

  const [fewShot, setFewShot] = useState<HistoryTurn[]>([]);
  useEffect(() => { try { const s = localStorage.getItem("ml_sql_fewshot"); if (s) setFewShot(JSON.parse(s)); } catch {} }, []);
  const [dynQ, setDynQ] = useState(SAMPLE_QUESTIONS);
  useEffect(() => {
    if (dbRef === "chinook") { setDynQ(SAMPLE_QUESTIONS); return; }
    fetch(`${ML_SQL_API}/sql/sample-questions?db_ref=${dbRef}&provider=${provider}`)
      .then(r => r.json()).then(d => { if (d.questions?.length) setDynQ(d.questions.map((q: unknown) => String(q))); }).catch(() => {});
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
      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); }
      catch { throw new Error("Backend is waking up — wait ~15s and try again"); }
      if (data.error) throw new Error(data.error as string);
      const schema = data.schema as { tables: Record<string, unknown> };
      setSchema(schema.tables as Record<string, SchemaTable>); setDbRef(data.db_ref as string); setGlossary("");
      setStatus(`Loaded: ${Object.keys(schema.tables).length} tables`);
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
      const text2 = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text2); }
      catch { throw new Error("Backend is waking up — wait ~15s and try again"); }
      if (data.error) throw new Error(data.error as string);
      const tables2 = data.tables as Record<string, SchemaTable>;
      setSchema(tables2); setDbRef(data.db_ref as string); setGlossary("");
      setStatus(`Connected: ${Object.keys(tables2).length} tables`);
    } catch (e: unknown) { setStatus(`Connection failed: ${(e as Error).message}`); }
  }, []);

  const runQuery = useCallback(async (questionOverride?: string, existingTabId?: string) => {
    const activeQ = String(questionOverride ?? question);
    if (!activeQ.trim() || running) return;
    readerRef.current?.cancel();

    let tabId: string;
    if (existingTabId) {
      tabId = existingTabId;
      patchTab(tabId, { sql: null, currentSql: null, originalSql: null, results: null, error: null, currentPage: 1, totalCount: -1, activeFilter: null });
      setActiveTabId(tabId);
    } else {
      tabId = Date.now().toString();
      const newTab: ResultTab = { id: tabId, question: activeQ, sql: null, currentSql: null, originalSql: null, results: null, error: null, currentPage: 1, totalCount: -1, activeFilter: null };
      setTabs(prev => {
        const pinned = prev.filter(t => t.pinned);
        const unpinned = prev.filter(t => !t.pinned);
        const kept = unpinned.slice(-(Math.max(0, 4 - pinned.length)));
        return [...pinned, ...kept, newTab];
      });
      setActiveTabId(tabId);
    }
    setRunning(true); setRetryMsg(""); setStatus("Sending query…");

    const fewShotPayload = fewShot.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: `Example. ${t.result_summary}` }));
    const historyPayload = [...fewShotPayload, ...history.slice(-3).map(t => ({ question: t.question, sql: t.sql, result_summary: t.result_summary }))];

    let finalSql = ""; let finalResults: Results | null = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: activeQ, provider, db_ref: dbRef, history: historyPayload, glossary, correction: getCorrection(dbRef, activeQ) }),
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

  runQueryRef.current = runQuery;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "k") { e.preventDefault(); questionRef.current?.focus(); questionRef.current?.select(); }
      if (ctrl && e.key === "Enter") { e.preventDefault(); runQueryRef.current?.(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const [showWalkthrough] = useState(() => {
    try { return !localStorage.getItem("ml_sql_walked"); } catch { return false; }
  });

  return (
    <div className="relative">
      {showWalkthrough && <WalkthroughTooltip />}
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

          <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId}
            onPin={id => patchTab(id, { pinned: !tabs.find(t => t.id === id)?.pinned })}
            onClose={closeTab} />

          <QueryResultPanel
            generatedSql={activeTab?.sql ?? null} copied={copied} copySQL={copySQL}
            question={activeTab?.question ?? question}
            results={activeTab?.results ?? null} error={activeTab?.error ?? null}
            onRetry={() => runQuery(activeTab?.question, activeTabId ?? undefined)} provider={provider}
            dbRef={dbRef} onRerun={() => runQuery(activeTab?.question, activeTabId ?? undefined)}
            currentPage={activeTab?.currentPage ?? 1} totalCount={activeTab?.totalCount ?? -1} pageSize={50}
            onPageChange={changePage} onFilter={filterResults} onClearFilter={clearFilter}
            filterActive={!!activeTab?.activeFilter} onRunSQL={runDirectSQL}
            onSuggest={q => { setQuestion(q); runQuery(q); }}
            chartOverride={activeTab?.chartOverride ?? null}
            onChartOverride={t => activeTabId && patchTab(activeTabId, { chartOverride: t })} />

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