"use client";

import { useState, useRef, useCallback } from "react";
import { ML_SQL_API } from "@/config/urls";
import {
  BarChart, HorizontalBarChart, AreaChart, ScatterChart,
  DonutChart, StatCard, MultiBarChart,
} from "./SqlChart";

const ACCENT = "#6366f1";

const SAMPLE_QUESTIONS = [
  "Show me the top 5 artists by total album count",
  "What is the total revenue for each year?",
  "Show the top 6 genres by number of tracks",
  "List the top 10 customers by total spending",
  "What is the average track length in milliseconds vs average unit price per genre?",
];

type DbSource = "demo" | "upload" | "postgres";
type Provider = "groq" | "gemini" | "cohere";

interface SchemaTable { columns: { name: string; type: string; pk: boolean }[]; row_count: number; }
interface Viz {
  chart_type: string;
  labels?: string[];
  values?: number[];
  x_label: string;
  y_label: string;
  x?: number[];
  y?: number[];
  value?: string;
  label?: string;
  series?: { name: string; values: number[] }[];
}

const CHART_LABEL: Record<string, string> = {
  bar: "Bar Chart", bar_h: "Horizontal Bar", area: "Area Chart",
  scatter: "Scatter Plot", donut: "Donut Chart", stat: "Result",
  multibar: "Multi-Series Bar", line: "Area Chart",
};

export default function TextToSqlRunner() {
  const [dbSource, setDbSource] = useState<DbSource>("demo");
  const [dbRef, setDbRef]       = useState("chinook");
  const [pgConn, setPgConn]     = useState("");
  const [schema, setSchema]     = useState<Record<string, SchemaTable> | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState<Provider>("groq");

  const [running, setRunning]       = useState(false);
  const [status, setStatus]         = useState("");
  const [retryMsg, setRetryMsg]     = useState("");
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [results, setResults]       = useState<{ columns: string[]; rows: unknown[][]; count: number; exec_time_ms: number } | null>(null);
  const [viz, setViz]               = useState<Viz | null>(null);
  const [explanation, setExplanation] = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const loadDemoSchema = useCallback(async () => {
    setStatus("Loading Chinook schema…");
    try {
      const res = await fetch(`${ML_SQL_API}/sql/schema?db_ref=chinook`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.tables);
      setDbRef("chinook");
      setStatus("");
    } catch (e: unknown) {
      setStatus(`Schema load failed: ${(e as Error).message}`);
    }
  }, []);

  const uploadDb = useCallback(async (file: File) => {
    setStatus("Uploading database…");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${ML_SQL_API}/sql/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.schema.tables);
      setDbRef(data.db_ref);
      setStatus(`Loaded: ${Object.keys(data.schema.tables).length} tables`);
    } catch (e: unknown) {
      setStatus(`Upload failed: ${(e as Error).message}`);
    }
  }, []);

  const connectPg = useCallback(async () => {
    if (!pgConn.trim()) return;
    setStatus("Connecting to PostgreSQL…");
    try {
      const res = await fetch(`${ML_SQL_API}/sql/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conn_str: pgConn }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchema(data.schema.tables);
      setDbRef(data.db_ref);
      setStatus(`Connected: ${Object.keys(data.schema.tables).length} tables`);
    } catch (e: unknown) {
      setStatus(`Connection failed: ${(e as Error).message}`);
    }
  }, [pgConn]);

  const runQuery = useCallback(async () => {
    if (!question.trim() || running) return;
    readerRef.current?.cancel();
    setRunning(true); setError(null); setGeneratedSql(null);
    setResults(null); setViz(null); setExplanation(""); setRetryMsg(""); setStatus("Sending query…");

    try {
      const res = await fetch(`${ML_SQL_API}/sql/query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, provider, db_ref: dbRef }),
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
            if (evt.type === "schema_loaded") setStatus(`Schema: ${evt.tables} tables`);
            else if (evt.type === "retry") setRetryMsg(`Retrying (attempt ${evt.attempt}/3): ${evt.error}`);
            else if (evt.type === "sql_generated") { setGeneratedSql(evt.sql); setStatus("Executing query…"); }
            else if (evt.type === "results")  { setResults(evt); setStatus(`${evt.count} rows in ${evt.exec_time_ms}ms`); }
            else if (evt.type === "visualization") setViz(evt);
            else if (evt.type === "token")    setExplanation(prev => prev + evt.text);
            else if (evt.type === "error")    setError(evt.text);
            else if (evt.type === "done")     setRunning(false);
          } catch { /* ignore malformed */ }
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [question, provider, dbRef, running]);

  const copySQL = useCallback(() => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [generatedSql]);

  // ── Schema panel ───────────────────────────────────────────────────────────
  const schemaPanel = schema ? (
    <div className="flex flex-col gap-1">
      {Object.entries(schema).map(([tname, t]) => (
        <details key={tname} className="group">
          <summary className="cursor-pointer text-xs font-mono px-2 py-1 rounded hover:bg-white/5 flex items-center gap-1">
            <span style={{ color: ACCENT }}>▶</span> {tname}
            <span className="ml-auto text-[10px] text-gray-500">{t.row_count.toLocaleString()}</span>
          </summary>
          <div className="pl-4 pb-1">
            {t.columns.map(c => (
              <div key={c.name} className="text-[10px] font-mono text-gray-400 flex gap-2">
                <span style={{ color: c.pk ? ACCENT : undefined }}>{c.name}</span>
                <span className="text-gray-600">{c.type}</span>
                {c.pk && <span style={{ color: ACCENT }} className="text-[9px]">PK</span>}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  ) : (
    <p className="text-xs text-gray-500 px-2">No DB loaded yet.</p>
  );

  return (
    <div className="flex gap-4 w-full max-w-7xl mx-auto px-4 pb-16">
      {/* ── Left: schema + samples ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-3 pt-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <button onClick={() => setSchemaOpen(o => !o)}
            className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1 w-full">
            <span>{schemaOpen ? "▾" : "▸"}</span> Schema
            {schema && <span className="ml-auto text-[10px] text-gray-500">{Object.keys(schema).length} tables</span>}
          </button>
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
      </aside>

      {/* ── Right: main area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 pt-2">
        {/* DB source tabs */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-2 mb-3">
            {(["demo", "upload", "postgres"] as DbSource[]).map(src => (
              <button key={src} onClick={() => setDbSource(src)}
                className="text-xs px-3 py-1 rounded-full border transition-colors"
                style={{
                  borderColor: dbSource === src ? ACCENT : "rgba(255,255,255,0.1)",
                  color: dbSource === src ? ACCENT : "#9ca3af",
                  background: dbSource === src ? `${ACCENT}18` : "transparent",
                }}>
                {src === "demo" ? "Chinook Demo" : src === "upload" ? "Upload SQLite" : "PostgreSQL"}
              </button>
            ))}
          </div>
          {dbSource === "demo" && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">Chinook music store — 11 tables, ~3.5k rows</p>
              <button onClick={loadDemoSchema}
                className="text-xs px-3 py-1 rounded-lg text-white"
                style={{ background: ACCENT }}>
                Load Schema
              </button>
            </div>
          )}
          {dbSource === "upload" && (
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs text-gray-400">Upload a .db / .sqlite file</span>
              <input type="file" accept=".db,.sqlite,.sqlite3" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDb(f); }} />
              <span className="text-xs px-3 py-1 rounded-lg text-white" style={{ background: ACCENT }}>
                Choose File
              </span>
            </label>
          )}
          {dbSource === "postgres" && (
            <div className="flex gap-2">
              <input value={pgConn} onChange={e => setPgConn(e.target.value)}
                placeholder="postgresql://user:pass@host:5432/db"
                className="flex-1 text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-gray-200 placeholder-gray-600 outline-none" />
              <button onClick={connectPg}
                className="text-xs px-3 py-1 rounded-lg text-white shrink-0"
                style={{ background: ACCENT }}>
                Connect
              </button>
            </div>
          )}
          {status && <p className="text-[11px] mt-2" style={{ color: ACCENT }}>{status}</p>}
        </div>

        {/* Query input */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
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
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Generated SQL */}
        {generatedSql && (
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Generated SQL</span>
              <button onClick={copySQL} className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gray-400 hover:text-white transition-colors">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">{generatedSql}</pre>
          </div>
        )}

        {/* Results table */}
        {results && results.columns.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Results</span>
              <span className="text-[11px] text-gray-500">{results.count} rows · {results.exec_time_ms}ms</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    {results.columns.map(c => (
                      <th key={c} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                          {cell === null ? <span className="text-gray-600">null</span>
                            : (() => { const n = Number(cell); return !isNaN(n) && String(cell).trim() !== "" && String(cell) !== String(Math.round(n)) ? n.toFixed(2) : String(cell); })()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.count > 20 && (
                <p className="text-[11px] text-gray-500 px-4 py-2">{results.count - 20} more rows not shown</p>
              )}
              {results.count >= 500 && (
                <p className="text-[11px] text-amber-400/80 px-4 py-2">
                  Results capped at 500 rows — your query matched more records. Add a LIMIT or WHERE clause to narrow results.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chart / Visualization */}
        {viz && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            {viz.chart_type !== "stat" && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {CHART_LABEL[viz.chart_type] ?? viz.chart_type}
              </p>
            )}
            {(viz.chart_type === "bar") && viz.labels && viz.values && (
              <BarChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
            )}
            {viz.chart_type === "bar_h" && viz.labels && viz.values && (
              <HorizontalBarChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
            )}
            {(viz.chart_type === "area" || viz.chart_type === "line") && viz.labels && viz.values && (
              <AreaChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} />
            )}
            {viz.chart_type === "scatter" && viz.x && viz.y && (
              <ScatterChart x={viz.x} y={viz.y} xLabel={viz.x_label} yLabel={viz.y_label} accent={ACCENT} labels={viz.labels} />
            )}
            {viz.chart_type === "donut" && viz.labels && viz.values && (
              <DonutChart labels={viz.labels} values={viz.values} xLabel={viz.x_label} accent={ACCENT} />
            )}
            {viz.chart_type === "stat" && viz.value != null && (
              <StatCard value={viz.value} label={viz.label ?? viz.x_label} accent={ACCENT} />
            )}
            {viz.chart_type === "multibar" && viz.labels && viz.series && (
              <MultiBarChart labels={viz.labels} series={viz.series} xLabel={viz.x_label} yLabel={viz.y_label} />
            )}
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Explanation</p>
            <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}