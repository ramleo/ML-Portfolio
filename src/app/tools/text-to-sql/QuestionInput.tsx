"use client";

import { type RefObject } from "react";
import PipelineStatus from "./PipelineStatus";

type Provider = "groq" | "gemini" | "cohere";

interface Props {
  questionRef: RefObject<HTMLTextAreaElement | null>;
  question: string;
  onQuestionChange: (q: string) => void;
  onSubmit: () => void;
  provider: Provider;
  onProviderChange: (p: Provider) => void;
  running: boolean;
  schema: Record<string, unknown> | null;
  onSurprise: () => void;
  retryMsg: string;
  hasSql: boolean;
  hasResults: boolean;
  shared: boolean;
  onShare: () => void;
  canShare: boolean;
}

export default function QuestionInput({
  questionRef, question, onQuestionChange, onSubmit,
  provider, onProviderChange, running, schema, onSurprise,
  retryMsg, hasSql, hasResults, shared, onShare, canShare,
}: Props) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300 ${
      running ? "border-indigo-500/40 bg-indigo-950/20 shadow-[0_0_24px_rgba(99,102,241,0.08)]" : "border-white/10 bg-white/5"
    }`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <textarea ref={questionRef} value={question} onChange={e => onQuestionChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
            placeholder={hasResults ? "Ask a follow-up or new question… (Enter to run)" : "Ask a question about your data… (Enter to run)"}
            rows={2}
            className="w-full text-sm bg-black/30 border border-white/10 focus:border-indigo-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] rounded-lg px-3 py-2 pr-7 text-gray-200 placeholder-gray-600 outline-none resize-none transition-all duration-200" />
          {question && (
            <button onClick={() => onQuestionChange("")} title="Clear"
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <select value={provider} onChange={e => onProviderChange(e.target.value as Provider)}
            className="text-xs bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-gray-300 outline-none">
            <option value="groq">Groq</option>
            <option value="gemini">Gemini</option>
            <option value="cohere">Cohere</option>
          </select>
          <button onClick={() => onSubmit()} disabled={running || !question.trim() || !schema}
            className={`text-xs px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-40 transition-all ${running ? "opacity-80" : "hover:brightness-110"}`}
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {running ? "Running…" : !schema ? "Load DB" : "Ask"}
          </button>
          <button onClick={onSurprise} disabled={running || !schema}
            className="text-[11px] px-4 py-1.5 rounded-lg border border-indigo-500/25 text-indigo-300/60 hover:text-indigo-200 hover:border-indigo-500/40 disabled:opacity-40 transition-all">
            Surprise me
          </button>
        </div>
      </div>
      <PipelineStatus running={running} retryMsg={retryMsg} hasSql={hasSql} hasResults={hasResults} hasExplanation={false} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-gray-600">SQL is AI-generated — accuracy depends on the LLM. Verify results before use.</p>
        {canShare && hasSql && (
          <button onClick={onShare} className="text-[10px] shrink-0 transition-colors"
            style={{ color: shared ? "#10b981" : "#6b7280" }}>
            {shared ? "✓ Link copied!" : "Share this query"}
          </button>
        )}
      </div>
    </div>
  );
}