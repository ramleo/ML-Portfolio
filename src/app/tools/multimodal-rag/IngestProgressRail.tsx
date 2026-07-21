"use client";

import { useCallback, useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { EmbeddingMode, IngestState, SaveScope } from "./_types";

const ACCENT = "#a78bfa";

type Props = {
  sessionId: string;
  ensureSessionId: () => string;
  onIngested: (result: Extract<IngestState, { kind: "done" }>) => void;
  /** Source of the currently-loaded document, if any — deleted before a new
   * upload starts so a session never holds more than one document at once
   * (avoids retrieval/citations silently mixing content from two uploads). */
  previousSource?: string | null;
};

const STEPS = ["extract", "embed"] as const;

function Toggle({ checked, onChange, label, caveat }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; caveat: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-[#a78bfa]" />
      <span>
        <span className="block text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
          {label}
        </span>
        <span className="block text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {caveat}
        </span>
      </span>
    </label>
  );
}

export default function IngestProgressRail({ sessionId, ensureSessionId, onIngested, previousSource }: Props) {
  const [state, setState] = useState<IngestState>({ kind: "idle" });
  const [findSimilar, setFindSimilar] = useState(false);
  const [shared, setShared] = useState(false);
  const [doneStep, setDoneStep] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setState({ kind: "uploading" });
    setDoneStep(new Set());
    setFileName(file.name);
    const sid = sessionId || ensureSessionId();
    const embeddingMode: EmbeddingMode = findSimilar ? "caption+clip" : "caption";

    if (previousSource) {
      // One document per session at a time — remove the old one first so
      // retrieval/citations can never mix content from two uploads.
      try {
        await fetch(`${ML_UNIFIED_API}/rag/uploads/${encodeURIComponent(previousSource)}`, { method: "DELETE" });
      } catch { /* best-effort — a stale chunk left behind is not fatal */ }
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("embedding_mode", embeddingMode);
    fd.append("save_scope", (shared ? "shared" : "session") as SaveScope);
    fd.append("session_id", sid);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-ingest`, { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error(`Upload failed: ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      setState({ kind: "extracting" });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.error) { setState({ kind: "error", message: evt.error }); return; }
            if (evt.step === "extract" && evt.status === "running") {
              setState({ kind: "extracting", page: evt.page, pages: evt.pages, indeterminate: !!evt.indeterminate });
            }
            if (evt.step === "extract" && evt.status === "done") {
              setDoneStep(s => new Set(s).add("extract"));
              setState({ kind: "embedding" });
            }
            if (evt.step === "embed" && evt.status === "done") {
              setDoneStep(s => new Set(s).add("embed"));
            }
            if (evt.done) {
              const result: Extract<IngestState, { kind: "done" }> = {
                kind: "done",
                source: evt.source,
                chunksAdded: evt.chunks_added,
                summary: evt.chunk_summary,
                pageImages: evt.page_images ?? [],
                cached: !!evt.cached,
                saveScope: evt.save_scope,
                embeddingMode,
              };
              setState(result);
              onIngested(result);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Upload failed" });
    }
  }, [sessionId, ensureSessionId, findSimilar, shared, onIngested, previousSource]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
  };

  return (
    <div style={cardStyle} className="flex flex-col gap-4 p-5">
      {state.kind === "idle" || state.kind === "error" ? (
        <>
          <div
            className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          >
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.25)" }}>
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4M8 8l4-4 4 4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              Drag & drop or click to upload a PDF, image, or CSV
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              PDF, PNG, JPG, GIF, WEBP · Max 10 MB · PDFs: first 8 pages
            </p>
          </div>
          {state.kind === "error" && (
            <div className="px-3 py-2 rounded-lg text-[11px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {state.message}
            </div>
          )}
          <div className="flex flex-col gap-3 pt-1">
            <Toggle checked={findSimilar} onChange={setFindSimilar}
              label="Also find visually similar figures"
              caveat="Adds a 'similar figures' button; downloads an extra ~350MB model on first use and adds a few seconds per figure. Doesn't change how chat answers are generated." />
            <Toggle checked={shared} onChange={setShared}
              label="Share with all visitors right now"
              caveat="Visible to everyone using the tool right now. Resets — like the built-in topics won't — the next time this demo server restarts." />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {fileName && (
            <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{fileName}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {STEPS.map((step, i) => {
              const isDone = doneStep.has(step);
              const isActive = !isDone && ((step === "extract" && state.kind !== "uploading") || (step === "embed" && state.kind === "embedding"));
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={isDone
                      ? { background: "#10b98130", color: "#10b981", border: "1px solid #10b98150" }
                      : isActive
                      ? { background: `${ACCENT}25`, color: ACCENT, border: `1px solid ${ACCENT}50` }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span className="text-[9px] capitalize"
                    style={{ color: isDone ? "#10b981" : isActive ? ACCENT : "rgba(255,255,255,0.25)" }}>
                    {step === "extract" ? "Extract + caption" : "Embed"}
                  </span>
                  {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />}
                </div>
              );
            })}
          </div>
          {state.kind === "extracting" && (
            <div className="flex flex-col gap-1">
              {state.indeterminate ? (
                <>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{
                      width: "40%", height: "100%", borderRadius: 9999,
                      background: ACCENT, animation: "mmragIndeterminate 1.3s ease-in-out infinite",
                    }} />
                  </div>
                  <style>{`@keyframes mmragIndeterminate { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>Analyzing image…</span>
                </>
              ) : state.pages ? (
                <>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{
                      width: `${Math.round(((state.page ?? 0) / state.pages) * 100)}%`, height: "100%",
                      borderRadius: 9999, background: ACCENT, transition: "width 0.3s ease",
                    }} />
                  </div>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Page {state.page ?? 0} of {state.pages}
                  </span>
                </>
              ) : null}
            </div>
          )}
          {state.kind === "done" && (
            <div className="flex items-center gap-2 flex-wrap text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span>
                {[
                  state.summary.text ? `${state.summary.text} text` : null,
                  state.summary.table ? `${state.summary.table} table` : null,
                  state.summary.figure ? `${state.summary.figure} figure` : null,
                  state.summary.image ? `${state.summary.image} image` : null,
                ].filter(Boolean).join(" · ")} chunk{(state.summary.text + state.summary.table + state.summary.figure + (state.summary.image ?? 0)) !== 1 ? "s" : ""}
              </span>
              {state.cached && <span style={{ color: ACCENT }}>(cached)</span>}
              {state.saveScope === "shared" && (
                <span className="px-1.5 py-px rounded" style={{ background: `${ACCENT}15`, color: ACCENT }}>
                  Shared
                </span>
              )}
              <button onClick={() => { setState({ kind: "idle" }); setFileName(null); }}
                className="ml-auto text-[9px] px-2 py-1 rounded-md border transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
                New document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}