"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

type Status = { kind: "idle" } | { kind: "uploading" } | { kind: "ok"; chunks: number; name: string } | { kind: "error"; message: string };

function UploadIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function RagIngestButton({ accent, compact = false }: { accent: string; compact?: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setStatus({ kind: "uploading" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${ML_UNIFIED_API}/rag/ingest`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      setStatus({ kind: "ok", chunks: data.chunks_added, name: data.source });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }, []);

  useEffect(() => {
    if (status.kind !== "ok" && status.kind !== "error") return;
    const t = setTimeout(() => setStatus({ kind: "idle" }), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const tooltip =
    status.kind === "ok" ? `Added ${status.chunks} chunks from ${status.name}`
    : status.kind === "error" ? status.message
    : "Upload a .pdf, .md, or .txt document to the knowledge base";

  if (compact) {
    return (
      <div style={{ position: "relative", display: "inline-flex" }}>
        <input ref={fileRef} type="file" accept=".pdf,.md,.txt" onChange={onFile} style={{ display: "none" }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={status.kind === "uploading"}
          title={tooltip}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            color: "var(--text3)", cursor: status.kind === "uploading" ? "default" : "pointer",
            padding: "3px 6px", display: "flex", alignItems: "center",
            opacity: status.kind === "uploading" ? 0.5 : 1,
          }}>
          <UploadIcon />
        </button>
        {(status.kind === "ok" || status.kind === "error") && (
          <span style={{
            position: "absolute", top: -3, right: -3, width: 7, height: 7, borderRadius: "50%",
            background: status.kind === "ok" ? "#34d399" : "#f87171",
            border: "1px solid rgba(8,15,30,1)",
          }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <input ref={fileRef} type="file" accept=".pdf,.md,.txt" onChange={onFile} style={{ display: "none" }} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status.kind === "uploading"}
        title="Upload a .pdf, .md, or .txt document to the knowledge base"
        style={{
          display: "flex", alignItems: "center", gap: "0.35rem",
          background: `${accent}0f`, border: `1px solid ${accent}28`, borderRadius: 8,
          color: accent, fontSize: "0.65rem", padding: "0.3rem 0.6rem",
          cursor: status.kind === "uploading" ? "default" : "pointer",
          opacity: status.kind === "uploading" ? 0.6 : 1,
        }}>
        <UploadIcon />
        {status.kind === "uploading" ? "Uploading…" : "Upload document"}
      </button>
      {status.kind === "ok" && (
        <span style={{ fontSize: "0.6rem", color: "var(--text3)" }}>
          Added {status.chunks} chunks from {status.name}
        </span>
      )}
      {status.kind === "error" && (
        <span style={{ fontSize: "0.6rem", color: "#f87171" }}>{status.message}</span>
      )}
    </div>
  );
}