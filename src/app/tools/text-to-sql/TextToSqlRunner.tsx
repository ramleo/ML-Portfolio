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
import type { Provider, SchemaTable } from "./_types";
import { SAMPLE_QUESTIONS } from "./_types";
import { useQueryRunner } from "./useQueryRunner";

const ACCENT = "#6a6cc8";

export default function TextToSqlRunner() {
  const [dbSource, setDbSource] = useState<DbSource>("demo");
  const [dbRef, setDbRef]       = useState("chinook");
  const [pgConn, setPgConn]     = useState("");
  const [mysqlConn, setMysqlConn] = useState("");
  const [mssqlConn, setMssqlConn] = useState("");
  const [schema, setSchema]     = useState<Record<string, SchemaTable> | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [provider, setProvider] = useState<Provider>("groq");
  const [glossary, setGlossary] = useState("");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [shared, setShared]     = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const questionRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    question, setQuestion,
    running, status, retryMsg,
    copied,
    history, setHistory,
    tabs, activeTabId, setActiveTabId,
    activeTab,
    patchTab, closeTab,
    runQuery, runDirectSQL, copySQL,
    changePage, filterResults, clearFilter,
  } = useQueryRunner({ dbRef, provider, glossary, questionRef });

  useEffect(() => { setGlossary(""); }, [dbRef]);

  const [dynQ, setDynQ] = useState(SAMPLE_QUESTIONS);
  useEffect(() => {
    if (dbRef === "chinook") { setDynQ(SAMPLE_QUESTIONS); return; }
    fetch(`${ML_SQL_API}/sql/sample-questions?db_ref=${dbRef}&provider=${provider}`)
      .then(r => r.json()).then(d => { if (d.questions?.length) setDynQ(d.questions.map((q: unknown) => String(q))); }).catch(() => {});
  }, [dbRef, provider]);

  const loadDemoSchema = useCallback(async () => {
    try {
      const res = await fetch(`${ML_SQL_API}/sql/schema?db_ref=chinook`);
      const data = await res.json().catch(() => { throw new Error("Backend warming up — wait 30s and click Load Schema again."); });
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSchema(data.tables); setDbRef("chinook");
    } catch { }
  }, []);
  useEffect(() => { loadDemoSchema(); }, [loadDemoSchema]);

  const uploadDb = useCallback(async (file: File) => {
    const form = new FormData(); form.append("file", file);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/upload`, { method: "POST", body: form });
      const text = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); }
      catch { return; }
      if (data.error) return;
      const s = data.schema as { tables: Record<string, unknown> };
      setSchema(s.tables as Record<string, SchemaTable>); setDbRef(data.db_ref as string); setGlossary("");
    } catch { }
  }, []);

  const connectRemote = useCallback(async (connStr: string, dbType: "postgresql" | "mysql" | "mssql") => {
    if (!connStr.trim()) return;
    try {
      const res = await fetch(`${ML_SQL_API}/sql/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conn_str: connStr, db_type: dbType }),
      });
      const text2 = await res.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text2); }
      catch { return; }
      if (data.error) return;
      const tables2 = data.tables as Record<string, SchemaTable>;
      setSchema(tables2); setDbRef(data.db_ref as string); setGlossary("");
    } catch { }
  }, []);

  const shareQuery = useCallback(() => {
    const url = `${window.location.origin}/tools/text-to-sql?q=${encodeURIComponent(question)}`;
    navigator.clipboard.writeText(url);
    setShared(true); setTimeout(() => setShared(false), 2000);
  }, [question]);

  const [showWalkthrough] = useState(() => {
    try { return !localStorage.getItem("ml_sql_walked"); } catch { return false; }
  });

  const schemaPanel = <SchemaPanel schema={schema} accent={ACCENT} />;

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
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors shrink-0">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="4" width="14" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="1" y="8" width="10" height="1.5" rx="0.75" fill="currentColor"/>
                <rect x="1" y="12" width="12" height="1.5" rx="0.75" fill="currentColor"/>
              </svg>
              Schema &amp; Tools
            </button>
            {schema && (
              <button onClick={() => setDiagramOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] text-xs text-[var(--text2)] hover:text-[var(--text)] hover:border-indigo-500/50 transition-colors">
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

          {/* Wrapped rather than anchored inside the panel: QueryResultPanel is
              403 lines, past the project's file-length limit, and splitting it
              is not this change.

              The anchor is conditional on there being results, because the
              panel itself renders unconditionally — an anchor that is always
              present is one a demo's waitFor resolves against instantly, which
              is the same as not waiting. This one appears exactly when there is
              something to wait for. */}
          <div data-wt={activeTab?.results ? "sql-results" : undefined}>
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
          </div>

          {activeTab?.results && !running && (
            <button onClick={() => { questionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); questionRef.current?.focus(); }}
              className="text-[11px] text-[var(--text3)] hover:text-indigo-400 transition-colors mx-auto flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M9 2H4a2 2 0 00-2 2v2M3 8L1 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Ask a follow-up — this query&apos;s context is retained
            </button>
          )}
        </div>
      </div>
    </div>
  );
}