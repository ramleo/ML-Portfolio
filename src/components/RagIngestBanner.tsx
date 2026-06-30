"use client";

import type { IngestStatus } from "./RagIngestButton";

export default function RagIngestBanner({ status, accent }: { status: IngestStatus; accent: string }) {
  if (status.kind === "idle") return null;

  const isError = status.kind === "error";

  return (
    <div style={{
      padding: "0.45rem 0.6rem", borderRadius: 8, fontSize: "0.65rem",
      background: isError ? "rgba(248,113,113,0.1)" : `${accent}0f`,
      border: `1px solid ${isError ? "rgba(248,113,113,0.3)" : accent + "28"}`,
      color: isError ? "#f87171" : "var(--text2)",
    }}>
      {status.kind === "uploading" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
            <span>Uploading document…</span><span>{status.progress}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${status.progress}%`, background: accent, transition: "width 0.15s" }} />
          </div>
        </>
      )}
      {status.kind === "processing" && (
        <>
          <div style={{ marginBottom: "0.3rem" }}>Indexing document…</div>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "100%", background: accent, opacity: 0.5 }} />
          </div>
        </>
      )}
      {status.kind === "ok" && (
        <span>Added {status.chunks} chunks from {status.name} — ready to ask questions.</span>
      )}
      {status.kind === "deleted" && (
        <span>Removed {status.name} from the knowledge base.</span>
      )}
      {status.kind === "error" && (
        <span>Upload failed: {status.message}</span>
      )}
    </div>
  );
}