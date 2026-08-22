"use client";

import { useState, useEffect } from "react";
import { saveCorrection, deleteCorrection, getCorrection } from "./_corrections";

const ML_SQL_URL = process.env.NEXT_PUBLIC_ML_SQL_URL ?? "https://wram1708-ml-sql.hf.space";

interface Props {
  question: string;
  sql: string;
  columns: string[];
  provider: string;
  dbRef: string;
  onRerun: (correction: string) => void;
}

function renderMd(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    // bold: **text**
    const parts = line.split(/\*\*(.+?)\*\*/g).map((seg, j) =>
      j % 2 === 1 ? <strong key={j} className="text-[var(--text)] font-semibold">{seg}</strong> : seg
    );
    // indent sub-bullets (lines starting with spaces + *)
    const isSub = /^\s+\*/.test(line);
    const isBullet = /^\s*\*\s/.test(line) && !/^\*\*/.test(line.trim());
    return (
      <span key={i} className={`block ${isSub ? "pl-4" : ""} ${isBullet ? "pl-2" : ""}`}>
        {parts}
      </span>
    );
  });
}

function cleanErr(e: string): string {
  if (/429|rate.?limit/i.test(e)) return "Rate limit reached — switch provider or wait ~60s.";
  return e;
}

export default function ReasoningPanel({ question, sql, columns, provider, dbRef, onRerun }: Props) {
  const [reasoning, setReasoning]       = useState("");
  const [loading, setLoading]           = useState(false);
  const [err, setErr]                   = useState<string | null>(null);
  const [shown, setShown]               = useState(false);
  const [correction, setCorrection]     = useState("");
  const [saved, setSaved]               = useState("");

  useEffect(() => {
    setReasoning(""); setErr(null); setShown(false); setCorrection("");
    setSaved(getCorrection(dbRef, question));
  }, [question, sql, dbRef]);

  const fetchReasoning = async () => {
    if (loading) return;
    setShown(true); setLoading(true); setErr(null); setReasoning("");
    try {
      const resp = await fetch(`${ML_SQL_URL}/sql/reason`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sql, columns, provider }),
      });
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") setReasoning(prev => prev + ev.text);
            else if (ev.type === "error") setErr(cleanErr(ev.text));
          } catch {}
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load reasoning");
    } finally { setLoading(false); }
  };

  const handleRerun = () => {
    if (!correction.trim()) return;
    saveCorrection(dbRef, question, correction);
    setSaved(correction.trim());
    onRerun(correction.trim());
    setCorrection("");
  };

  const handleDeleteSaved = () => {
    deleteCorrection(dbRef, question);
    setSaved("");
  };

  return (
    <div className="rounded-xl border border-indigo-500/15 bg-[var(--bg-glass)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-indigo-400 shrink-0">
          <path d="M2 2h8v6H7l-2 2V8H2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M4 5h4M4 6.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <span className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-widest flex-1">AI Reasoning</span>
        {!shown && (
          <button onClick={fetchReasoning}
            className="text-[10px] px-2.5 py-1 rounded-lg border border-indigo-500/30 text-indigo-400/70 hover:text-indigo-300 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all">
            Show Reasoning
          </button>
        )}
        {shown && !loading && reasoning && (
          <button onClick={() => setShown(false)}
            className="text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
            Hide
          </button>
        )}
      </div>

      {shown && (
        <div className="px-4 pt-3 pb-4">
          {loading && !reasoning && (
            <div className="flex items-center gap-2 text-[11px] text-indigo-400/60">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="animate-spin shrink-0">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/>
              </svg>
              Generating reasoning…
            </div>
          )}
          {err && <p className="text-[11px] text-red-400">{err}</p>}
          {reasoning && (
            <div className="text-[12px] text-[var(--text)] leading-relaxed space-y-0.5">
              {renderMd(reasoning)}
              {loading && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 animate-pulse rounded-sm" />}
            </div>
          )}

          {!loading && (reasoning || err) && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-amber-400 shrink-0">
                  <path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.93 2.93l1.41 1.41M7.66 7.66l1.41 1.41M2.93 9.07l1.41-1.41M7.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-widest">Teach the AI</span>
              </div>

              {saved && (
                <div className="mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/6">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5 text-emerald-400">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[10px] text-emerald-300/80 flex-1 leading-relaxed">
                    <span className="font-semibold">Saved correction:</span> {saved}
                  </p>
                  <button onClick={handleDeleteSaved} className="text-[9px] text-[var(--text3)] hover:text-red-400 transition-colors shrink-0">✕</button>
                </div>
              )}

              <textarea
                value={correction}
                onChange={e => setCorrection(e.target.value)}
                placeholder="Something wrong? Tell the AI what it got wrong — e.g. &quot;revenue means UnitPrice × Quantity, not just UnitPrice&quot;"
                rows={3}
                className="w-full text-[11px] font-mono bg-[var(--bg-glass)] border border-amber-500/20 rounded-lg px-3 py-2 text-[var(--text)] placeholder:text-[var(--text3)] outline-none resize-none focus:border-amber-500/40 transition-colors leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[9px] text-[var(--text3)]">Your correction will be saved and applied to all future queries on this dataset</p>
                <button
                  onClick={handleRerun}
                  disabled={!correction.trim()}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={correction.trim()
                    ? { background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.4)", color: "#fbbf24" }
                    : { background: "var(--border)", borderColor: "var(--border)", color: "var(--text3)" }
                  }
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M10 6A4 4 0 112 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M10 3v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Fix &amp; Re-run
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}