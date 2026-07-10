"use client";

import React from "react";
import SavedQueriesPanel from "./SavedQueriesPanel";

interface Props {
  schemaOpen: boolean;
  onToggleSchema: () => void;
  schema: Record<string, unknown> | null;
  onOpenDiagram: () => void;
  schemaPanel: React.ReactNode;
  sampleQuestions: string[];
  onSelectQuestion: (q: string) => void;
  glossary: string;
  onGlossaryChange: (v: string) => void;
  glossaryOpen: boolean;
  onToggleGlossary: () => void;
  currentQuery: { question: string; sql: string } | null;
  onLoadSaved: (q: string) => void;
}

export default function DesktopSidebar({
  schemaOpen, onToggleSchema, schema, onOpenDiagram, schemaPanel,
  sampleQuestions, onSelectQuestion, glossary, onGlossaryChange,
  glossaryOpen, onToggleGlossary, currentQuery, onLoadSaved,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-2.5 pt-2">
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <button onClick={onToggleSchema}
            className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5 flex-1 hover:text-white transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d={schemaOpen ? "M2 4l4 4 4-4" : "M4 2l4 4-4 4"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Schema
            {schema && <span className="ml-auto text-[9px] text-gray-600 font-normal">{Object.keys(schema).length} tables</span>}
          </button>
        </div>
        {schema && (
          <button onClick={onOpenDiagram}
            className="w-full mb-2 flex items-center justify-center gap-1.5 text-[10px] py-1 rounded-lg border border-white/8 text-gray-500 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="10" y="1" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M6 3h4M8 5v6M6 13h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            View ER Diagram
          </button>
        )}
        {schemaOpen && schemaPanel}
      </div>
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        <p className="text-[9px] font-semibold text-indigo-400/50 mb-2 uppercase tracking-widest">Try asking</p>
        {sampleQuestions.map(q => (
          <button key={q} onClick={() => onSelectQuestion(q)}
            className="w-full text-left text-[10px] text-gray-500 hover:text-indigo-300 py-1 px-1.5 rounded-lg hover:bg-indigo-500/8 transition-all flex gap-1.5 group">
            <span className="text-indigo-700 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors">›</span>
            <span>{q}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        <button onClick={onToggleGlossary}
          className="text-[9px] font-semibold text-indigo-400/50 mb-1 flex items-center gap-1 w-full uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
            <path d={glossaryOpen ? "M1 3l3 3 3-3" : "M3 1l3 3-3 3"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Glossary
        </button>
        {glossaryOpen && (
          <>
            <textarea value={glossary} onChange={e => onGlossaryChange(e.target.value)}
              placeholder={"revenue: sum of invoice totals\nLTV: lifetime value of customer"}
              rows={5}
              className="w-full text-[10px] font-mono bg-black/40 border border-white/8 rounded-lg px-2 py-1.5 text-gray-300 placeholder-gray-600 outline-none resize-none mt-1 focus:border-indigo-500/40 transition-colors" />
            <p className="text-[9px] text-gray-700 mt-1">Injected into every SQL prompt</p>
          </>
        )}
      </div>
      <SavedQueriesPanel currentQuery={currentQuery} onLoad={onLoadSaved} />
    </aside>
  );
}