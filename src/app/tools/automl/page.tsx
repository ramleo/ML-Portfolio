"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PipelineProvider } from "@/context/PipelineContext";
import AutoMLModal from "@/components/modals/AutoMLModal";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#818cf8";

// Thin page wrapper: provides the page shell + handles prep handoff from sessionStorage.
// AutoMLModal renders its content directly (isPage=true skips ModalShell).

function AutoMLPageInner() {
  const router  = useRouter();
  const fileRef = useRef<{ trigger: (f: File) => void } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("prep_handoff");
      if (!raw) return;
      sessionStorage.removeItem("prep_handoff");
      const { csv_b64, filename } = JSON.parse(raw) as { csv_b64: string; filename: string };
      const bytes = atob(csv_b64);
      const arr   = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "text/csv" });
      const file = new File([blob], filename, { type: "text/csv" });
      fileRef.current?.trigger(file);
    } catch { /* ignore */ }
  }, []);

  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />
      {/* Page header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>ML Capabilities</span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>AutoML Pipeline</span>
          </div>
        </div>
      </div>

      {/* AutoML wizard content — no wrapper card, renders directly on page background */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>
        <AutoMLModal onClose={handleBack} isPage />
      </div>
    </div>
  );
}

export default function AutoMLPage() {
  return (
    <PipelineProvider>
      <AutoMLPageInner />
    </PipelineProvider>
  );
}