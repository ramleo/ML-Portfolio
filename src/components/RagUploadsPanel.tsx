"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { IngestStatus } from "./RagIngestButton";
import { trackedFetch } from "@/lib/trackedFetch";

function ManageIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function RagUploadsPanel({
  accent, onStatusChange,
}: { accent: string; onStatusChange: (s: IngestStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/uploads`, undefined, { tool: "rag-uploads" });
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const remove = useCallback(async (source: string) => {
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/uploads/${encodeURIComponent(source)}`, { method: "DELETE" }, { tool: "rag-uploads" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      onStatusChange({ kind: "deleted", name: source });
      setSources(s => s.filter(x => x !== source));
    } catch (err) {
      onStatusChange({ kind: "error", message: err instanceof Error ? err.message : "Delete failed" });
    }
  }, [onStatusChange]);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Manage uploaded documents"
        style={{
          background: open ? `${accent}22` : "transparent", border: `1px solid ${open ? accent + "55" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 6, color: open ? accent : "var(--text3)", cursor: "pointer",
          padding: "3px 6px", display: "flex", alignItems: "center",
        }}>
        <ManageIcon />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, width: 220, zIndex: 10,
          background: "rgba(8,15,30,0.98)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: "0.5rem",
        }}>
          <div style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: "0.4rem" }}>
            Uploaded documents
          </div>
          {loading && <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>Loading…</div>}
          {!loading && sources.length === 0 && (
            <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>No documents uploaded yet.</div>
          )}
          {!loading && sources.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0" }}>
              <span style={{ flex: 1, fontSize: "0.65rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s}
              </span>
              <button onClick={() => remove(s)} title={`Remove ${s}`}
                style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "2px", display: "flex" }}>
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}