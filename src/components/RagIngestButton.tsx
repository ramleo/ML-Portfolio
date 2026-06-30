"use client";

import { useRef, useCallback } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

export type IngestStatus =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "processing" }
  | { kind: "ok"; chunks: number; name: string }
  | { kind: "error"; message: string };

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

export default function RagIngestButton({
  busy, onStatusChange,
}: { busy: boolean; onStatusChange: (s: IngestStatus) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    onStatusChange({ kind: "uploading", progress: 0 });

    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      onStatusChange(pct >= 100 ? { kind: "processing" } : { kind: "uploading", progress: pct });
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          onStatusChange({ kind: "ok", chunks: data.chunks_added, name: data.source });
        } else {
          onStatusChange({ kind: "error", message: data.detail || xhr.statusText });
        }
      } catch {
        onStatusChange({ kind: "error", message: xhr.statusText || "Upload failed" });
      }
    };
    xhr.onerror = () => onStatusChange({ kind: "error", message: "Network error" });
    xhr.open("POST", `${ML_UNIFIED_API}/rag/ingest`);
    xhr.send(fd);
  }, [onStatusChange]);

  return (
    <div style={{ display: "inline-flex" }}>
      <input ref={fileRef} type="file" accept=".pdf,.md,.txt" onChange={onFile} style={{ display: "none" }} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Upload a .pdf, .md, or .txt document to the knowledge base"
        style={{
          background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          color: "var(--text3)", cursor: busy ? "default" : "pointer",
          padding: "3px 6px", display: "flex", alignItems: "center",
          opacity: busy ? 0.5 : 1,
        }}>
        <UploadIcon />
      </button>
    </div>
  );
}