"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { RefObject } from "react";
import { ML_SQL_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";
import { track } from "@/hooks/useAnalytics";
import { EV, ERR, STAGE } from "@/lib/logEvents";
import type { Provider, HistoryTurn, Results, ResultTab } from "./_types";
import { getCorrection } from "./_corrections";
import { incrementQueryCount } from "@/hooks/useAnalytics";

const TOOL = "text-to-sql";

// ANALYTICS ONLY — the request body below sends `provider`, never `model`.
// The model actually used comes from services/ml-sql/routers/_providers.py, so
// this must mirror that file or the Model-breakdown chart reports a model that
// was never called. openai/anthropic were listed here but ml-sql has no such
// providers, and the dropdown's gemini/cohere were missing entirely.
const PROVIDER_MODEL: Record<string, string> = {
  groq: "groq/compound",
  gemini: "gemini-3.6-flash",
  cohere: "command-r-plus-08-2024",
  mistral: "codestral-latest",
};

interface QueryRunnerDeps {
  dbRef: string;
  provider: Provider;
  glossary: string;
  questionRef: RefObject<HTMLTextAreaElement | null>;
}

export function useQueryRunner({ dbRef, provider, glossary, questionRef }: QueryRunnerDeps) {
  const [question, setQuestion] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("q") ?? ""; } catch { return ""; }
  });
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [retryMsg, setRetryMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [fewShot, setFewShot] = useState<HistoryTurn[]>([]);
  const [tabs, setTabs] = useState<ResultTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;
  const tabsRef = useRef<ResultTab[]>(tabs);
  tabsRef.current = tabs;
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const runQueryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("ml_sql_tabs");
      if (s) setTabs(JSON.parse(s));
      setActiveTabId(sessionStorage.getItem("ml_sql_active_tab") ?? null);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => { if (!hydrated) return; try { sessionStorage.setItem("ml_sql_tabs", JSON.stringify(tabs)); } catch {} }, [tabs, hydrated]);
  useEffect(() => { if (!hydrated) return; try { if (activeTabId) sessionStorage.setItem("ml_sql_active_tab", activeTabId); else sessionStorage.removeItem("ml_sql_active_tab"); } catch {} }, [activeTabId, hydrated]);

  useEffect(() => {
    const tab = tabsRef.current.find(t => t.id === activeTabId);
    if (tab?.question) setQuestion(tab.question);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  useEffect(() => { try { const s = localStorage.getItem("ml_sql_fewshot"); if (s) setFewShot(JSON.parse(s)); } catch {} }, []);

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
    const t0 = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    const runId = newRunId();
    // The provider that ACTUALLY answered, reported by the sql_generated event.
    // ml-sql falls back groq -> mistral -> gemini -> cohere, so the picked
    // provider is only a request, not a fact. Seeded with the request so a run
    // that fails before sql_generated still logs something sane.
    let usedProvider = provider;
    let usedModel = PROVIDER_MODEL[provider] ?? provider;
    trackRunStart(TOOL, runId, { provider, model: PROVIDER_MODEL[provider] ?? provider,
                                 query_length: activeQ.length, db_ref: dbRef });
    try {
      const res = await trackedFetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: activeQ, provider, db_ref: dbRef, history: historyPayload, glossary, correction: getCorrection(dbRef, activeQ) }),
        signal: controller.signal,
      }, { tool: TOOL, runId, streaming: true, meta: { provider } });
      // ml-sql refuses with plain JSON, not a stream (403 origin, 429 rate or
      // daily limit): show its message rather than an empty result.
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `Request failed (${res.status}).`);
      }
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
              if (evt.provider) usedProvider = evt.provider;
              if (evt.model) usedModel = evt.model;
              if (evt.fell_back_from) {
                setRetryMsg(`${evt.fell_back_from} was unavailable — answered by ${evt.provider} instead`);
              }
              patchTab(tabId, { sql: evt.sql, currentSql: evt.sql, originalSql: evt.sql });
              setStatus("Executing…");
            }
            else if (evt.type === "results") {
              finalResults = evt;
              patchTab(tabId, { results: evt, totalCount: evt.total_count ?? -1 });
              setStatus(`${evt.count} rows in ${evt.exec_time_ms}ms`);
              incrementQueryCount(TOOL);
              track(EV.RESULT_VIEW, { duration_ms: Date.now() - t0, meta: {
                tool: TOOL, run_id: runId, result_count: evt.count,
                provider: usedProvider, model: usedModel,
                requested_provider: provider,
                query_length: activeQ.length } });
            }
            else if (evt.type === "error") {
              patchTab(tabId, { error: evt.text });
              // An SSE {type:"error"} arrives inside a 200 response, so
              // trackedFetch saw a success. This is the real outcome.
              track(EV.RUN_ERROR, { duration_ms: Date.now() - t0, meta: {
                tool: TOOL, run_id: runId, stage: STAGE.RUN,
                error_class: /429|Too Many Requests/i.test(evt.text ?? "")
                  ? ERR.RATE_LIMITED : ERR.UNKNOWN,
                provider: usedProvider, model: usedModel,
                requested_provider: provider,
                query_length: activeQ.length,
                message: (evt.text ?? "").slice(0, 120) } });
            }
            else if (evt.type === "done")  setRunning(false);
          } catch { }
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
        } catch { }
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
  }, [questionRef]);

  const runDirectSQL = useCallback(async (sql: string) => {
    if (!activeTabId) return;
    const tabId = activeTabId;
    try {
      const res = await trackedFetch(`${ML_SQL_API}/sql/page`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db_ref: dbRef, page: 1, page_size: 50 }),
      }, { tool: "text-to-sql-run-sql" });
      const data = await res.json();
      if (data.error) { patchTab(tabId, { error: data.error }); return; }
      patchTab(tabId, { sql, currentSql: sql, originalSql: sql, results: data, currentPage: 1, totalCount: data.total_count ?? -1, error: null });
    } catch (e: unknown) { patchTab(activeTabId, { error: `Execution failed: ${(e as Error).message}` }); }
  }, [activeTabId, dbRef, patchTab]);

  const copySQL = useCallback(() => {
    if (!activeTab?.sql) return;
    navigator.clipboard.writeText(activeTab.sql);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    track(EV.COPY, { meta: { tool: TOOL, what: "sql" } });
  }, [activeTab]);

  const changePage = useCallback(async (page: number) => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.currentSql) return;
    const { id: tabId, currentSql } = tab;
    const res = await trackedFetch(`${ML_SQL_API}/sql/page`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: currentSql, db_ref: dbRef, page, page_size: 50 }),
    }, { tool: "text-to-sql-page", meta: { page } });
    const data = await res.json();
    if (!data.error) patchTab(tabId, { results: data, currentPage: page });
  }, [tabs, activeTabId, dbRef, patchTab]);

  const filterResults = useCallback(async (filterText: string) => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.currentSql || !tab.results) return;
    const { id: tabId, currentSql, results: tabResults } = tab;
    try {
      const res = await trackedFetch(`${ML_SQL_API}/sql/filter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: currentSql, db_ref: dbRef, filter_text: filterText, columns: tabResults.columns, provider }),
      }, { tool: "text-to-sql-filter", meta: { provider } });
      const data = await res.json();
      if (data.error) { patchTab(tabId, { error: data.error }); return; }
      patchTab(tabId, { results: data, currentPage: 1, totalCount: data.total_count ?? -1, currentSql: data.filtered_sql, activeFilter: filterText });
    } catch (e: unknown) { patchTab(tabId, { error: `Filter failed: ${(e as Error).message}` }); }
  }, [tabs, activeTabId, dbRef, provider, patchTab]);

  const clearFilter = useCallback(async () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.originalSql) return;
    const { id: tabId, originalSql } = tab;
    const res = await trackedFetch(`${ML_SQL_API}/sql/page`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: originalSql, db_ref: dbRef, page: 1, page_size: 50 }),
    }, { tool: "text-to-sql-clear-filter" });
    const data = await res.json();
    if (!data.error) patchTab(tabId, { currentSql: originalSql, activeFilter: null, results: data, currentPage: 1 });
  }, [tabs, activeTabId, dbRef, patchTab]);

  return {
    question, setQuestion,
    running, status, retryMsg,
    copied,
    history, setHistory,
    fewShot,
    tabs, setTabs, activeTabId, setActiveTabId,
    activeTab, tabsRef,
    patchTab, closeTab,
    runQuery, runDirectSQL, copySQL,
    changePage, filterResults, clearFilter,
  };
}
