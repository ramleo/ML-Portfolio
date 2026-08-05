"use client";

import { useCallback, useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { EmbeddingMode, IngestState, SaveScope } from "./_types";

const ACCENT = "#a78bfa";

type Props = {
  sessionId: string;
  ensureSessionId: () => string;
  onIngested: (result: Extract<IngestState, { kind: "done" }>) => void;
  /** Hides the "find similar figures"/"share with all visitors" toggles —
   * for a tool whose uploads are privacy-sensitive by nature (e.g. a
   * contract/invoice), a "share this publicly" checkbox doesn't make
   * sense to offer at all. Ingest behavior is unchanged either way
   * (both toggles simply stay at their default `false`). */
  hideToggles?: boolean;
  /** Skips this component's own bordered card wrapper — for embedding
   * inside another component (e.g. DocumentTray) that already provides
   * the surrounding card, so the two don't nest into a double border. */
  bare?: boolean;
};

const STEPS = ["extract", "embed"] as const;

const AUDIO_EXT_RE = /\.(mp3|wav|m4a|ogg|flac|aac|wma)$/i;

/** The indeterminate progress bar is shared across every "one atomic call,
 * no sub-steps" upload type (image, CSV, audio) — label it by the actual
 * file being processed instead of a hardcoded "image" string. */
function indeterminateLabel(fileName: string | null): string {
  const lower = (fileName ?? "").toLowerCase();
  if (AUDIO_EXT_RE.test(lower)) return "Transcribing audio…";
  if (lower.endsWith(".csv")) return "Analyzing spreadsheet…";
  return "Analyzing image…";
}

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

export default function IngestProgressRail({ sessionId, ensureSessionId, onIngested, hideToggles, bare }: Props) {
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
                fileType: evt.file_type ?? "pdf",
                pageImages: evt.page_images ?? [],
                cached: !!evt.cached,
                saveScope: evt.save_scope,
                embeddingMode,
                notableChunks: (evt.notable_chunks ?? []).map((c: { chunk_type: string | null; page: number | null; text: string; timestamp_s?: number | null; bbox?: [number, number, number, number] | null; objects?: { label: string; confidence: number; bbox: [number, number, number, number] }[] | null; number_mismatch?: boolean | null; pii_types?: string | null; blurry?: boolean | null; entities?: { type: string; value: string }[] | null }) => ({
                  chunkType: c.chunk_type, page: c.page, text: c.text, timestampS: c.timestamp_s ?? null, bbox: c.bbox ?? null, objects: c.objects ?? null, numberMismatch: !!c.number_mismatch, piiTypes: c.pii_types ?? null, blurry: !!c.blurry, entities: c.entities ?? null,
                })),
                transcript: evt.transcript ?? null,
                transcriptSegments: (evt.transcript_segments ?? []).map((s: { start: number; end: number; text: string; speaker?: string | null }) => ({
                  start: s.start, end: s.end, text: s.text, speaker: s.speaker ?? null,
                })),
                chapters: (evt.chapters ?? []).map((c: { time: number; label: string }) => ({
                  time: c.time, label: c.label,
                })),
                possibleRevisionOf: evt.possible_revision_of ?? null,
                entityTypes: evt.entity_types ?? [],
                textSegments: (evt.text_segments ?? []).map((s: { page: number | null; text: string }) => ({
                  page: s.page, text: s.text,
                })),
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
  }, [sessionId, ensureSessionId, findSimilar, shared, onIngested]);

  const cardStyle: React.CSSProperties = bare ? {} : {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
  };

  return (
    <div style={cardStyle} className={bare ? "flex flex-col gap-4" : "flex flex-col gap-4 p-5"}>
      {state.kind === "idle" || state.kind === "error" ? (
        <>
          <div
            className={bare
              ? "flex flex-col items-center justify-center gap-1.5 py-5 rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-white/5"
              : "flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-white/5"}
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          >
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.mp4,.mov,.webm,.avi,.mkv,.mp3,.wav,.m4a,.ogg,.flac,.aac" className="hidden"
              onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); }} />
            <svg width={bare ? 18 : 32} height={bare ? 18 : 32} viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.25)" }}>
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4M8 8l4-4 4 4"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {bare ? (
              <>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Add a document, image, or video
                </p>
                <p className="text-[9px] text-center px-2" style={{ color: "rgba(255,255,255,0.22)" }}>
                  PDF, image, video, or audio · Max 20 MB
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Drag & drop or click to upload a PDF, image, CSV, video, or audio file
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  PDF, PNG, JPG, GIF, WEBP, MP4/MOV/WEBM/AVI/MKV, MP3/WAV/M4A/OGG/FLAC/AAC · Max 20 MB ·
                  PDFs: first 8 pages · Videos: audio transcript + up to 6 sampled frames · Audio: full transcript
                </p>
              </>
            )}
          </div>
          {state.kind === "error" && (
            <div className="px-3 py-2 rounded-lg text-[11px]"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {state.message}
            </div>
          )}
          {!hideToggles && (
            <div className="flex flex-col gap-3 pt-1">
              <Toggle checked={findSimilar} onChange={setFindSimilar}
                label="Also find visually similar figures"
                caveat="Adds a 'similar figures' button; downloads an extra ~350MB model on first use and adds a few seconds per figure. Doesn't change how chat answers are generated." />
              <Toggle checked={shared} onChange={setShared}
                label="Share with all visitors right now"
                caveat="Visible to everyone using the tool right now. Resets — like the built-in topics won't — the next time this demo server restarts." />
            </div>
          )}
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
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>{indeterminateLabel(fileName)}</span>
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
                  state.summary.video ? `${state.summary.video} video` : null,
                ].filter(Boolean).join(" · ")} chunk{(state.summary.text + state.summary.table + state.summary.figure + (state.summary.image ?? 0) + (state.summary.video ?? 0)) !== 1 ? "s" : ""}
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
                Add another document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}