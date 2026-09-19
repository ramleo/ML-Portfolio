"use client";

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";

/** Generic user-guide modal for a platform world, themed by an accent.
 *  Reused by the Testwright and Text-to-SQL landings. */
export default function WorldUserGuideModal({
  open, onClose, title, accent, guide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  accent: string;
  guide: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const MD = {
    h1: ({ children }: React.PropsWithChildren) => <h1 className="text-lg font-bold mb-4" style={{ color: accent }}>{children}</h1>,
    h2: ({ children }: React.PropsWithChildren) => <h2 className="text-[13px] font-bold uppercase tracking-wide mt-6 mb-2" style={{ color: `${accent}cc` }}>{children}</h2>,
    h3: ({ children }: React.PropsWithChildren) => <h3 className="text-[12px] font-bold mt-4 mb-1" style={{ color: "var(--text)" }}>{children}</h3>,
    p: ({ children }: React.PropsWithChildren) => <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--text2)" }}>{children}</p>,
    ul: ({ children }: React.PropsWithChildren) => <ul className="list-disc pl-5 mb-2 flex flex-col gap-1">{children}</ul>,
    ol: ({ children }: React.PropsWithChildren) => <ol className="list-decimal pl-5 mb-2 flex flex-col gap-1">{children}</ol>,
    li: ({ children }: React.PropsWithChildren) => <li className="text-[12px] leading-relaxed" style={{ color: "var(--text2)" }}>{children}</li>,
    strong: ({ children }: React.PropsWithChildren) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
    code: ({ children }: React.PropsWithChildren) => <code className="text-[11px] px-1 py-0.5 rounded" style={{ background: "var(--surface)", color: accent }}>{children}</code>,
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: `1px solid ${accent}30` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>User Guide — {title}</span>
          <button onClick={onClose} aria-label="Close guide" className="text-lg leading-none px-1" style={{ color: "var(--text3)" }}>×</button>
        </div>
        <div className="overflow-y-auto px-6 py-4">
          <ReactMarkdown components={MD}>{guide}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
