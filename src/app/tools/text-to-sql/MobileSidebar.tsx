"use client";

interface Props {
  open: boolean;
  onClose: () => void;
  hasSchema: boolean;
  schemaPanel: React.ReactNode;
  sampleQuestions: string[];
  onQuestion: (q: string) => void;
  glossary: string;
  onGlossaryChange: (g: string) => void;
  onOpenDiagram: () => void;
}

export default function MobileSidebar({
  open, onClose, hasSchema, schemaPanel,
  sampleQuestions, onQuestion,
  glossary, onGlossaryChange, onOpenDiagram,
}: Props) {
  if (!open) return null;

  const close = () => onClose();

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close}/>
      <div className="fixed inset-y-0 left-0 z-40 w-72 bg-[var(--bg)] border-r border-[var(--border)] overflow-y-auto p-3 flex flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[var(--text)]">Schema &amp; Tools</span>
          <button onClick={close} className="text-[var(--text2)] hover:text-[var(--text)] p-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-3">
          {hasSchema && (
            <button onClick={() => { onOpenDiagram(); close(); }}
              className="w-full mb-2 flex items-center justify-center gap-1.5 text-[11px] py-1 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:border-indigo-500/50 transition-colors">
              View Diagram
            </button>
          )}
          {schemaPanel}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-3">
          <p className="text-[10px] font-semibold text-[var(--text2)] mb-2 uppercase tracking-wide">Sample Questions</p>
          {sampleQuestions.map(q => (
            <button key={q} onClick={() => { onQuestion(q); close(); }}
              className="text-[10px] text-left text-[var(--text2)] hover:text-[var(--text)] w-full py-0.5 hover:pl-1 transition-all">
              › {q}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] p-3">
          <p className="text-[10px] font-semibold text-[var(--text2)] mb-2 uppercase tracking-wide">Glossary</p>
          <textarea
            value={glossary} onChange={e => onGlossaryChange(e.target.value)}
            placeholder={"e.g. revenue: total of all sales\nLTV: lifetime value of a customer"}
            rows={4}
            className="w-full text-[10px] font-mono bg-[var(--bg-glass)] border border-[var(--border)] rounded px-2 py-1.5 text-[var(--text)] placeholder:text-[var(--text3)] outline-none resize-none"/>
          <p className="text-[9px] text-[var(--text3)] mt-1">Injected into every SQL prompt</p>
        </div>
      </div>
    </>
  );
}