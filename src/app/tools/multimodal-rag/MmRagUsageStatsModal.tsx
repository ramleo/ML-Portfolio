"use client";

import { useEffect } from "react";
import AnalyticsContent from "../rag-analytics/AnalyticsContent";

const ACCENT = "#7e68c0";

export default function MmRagUsageStatsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: `1px solid ${ACCENT}30` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT }}>
            Usage Stats — Multimodal RAG
          </span>
          <button onClick={onClose} aria-label="Close usage stats"
            className="text-lg leading-none px-1" style={{ color: "var(--text3)" }}>
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">
          <AnalyticsContent />
        </div>
      </div>
    </div>
  );
}