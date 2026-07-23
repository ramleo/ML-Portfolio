"use client";

import { useEffect, useRef, useState } from "react";
import RagSourceCard from "@/components/RagSourceCard";
import type { IngestState, TranscriptSegment } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;

type Props = {
  doc: Doc;
  accent: string;
  cardStyle: React.CSSProperties;
  highlightedIndex: number | null;
  onSegmentRef: (i: number, el: HTMLParagraphElement | null) => void;
  onSelectChunk: (chunkType: string | null | undefined, page: number | null | undefined, text: string) => void;
  onSelectChapter: (time: number) => void;
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function srtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function buildSrt(segments: TranscriptSegment[]): string {
  return segments.map((seg, i) =>
    `${i + 1}\n${srtTimestamp(seg.start)} --> ${srtTimestamp(seg.end)}\n${seg.text}\n`
  ).join("\n");
}

function highlightMatches(text: string, query: string, accent: string) {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: `${accent}55`, color: "inherit", borderRadius: 2 }}>{part}</mark>
      : part
  );
}

export default function DocumentSummaryPanel({ doc: d, accent, cardStyle, highlightedIndex,
                                               onSegmentRef, onSelectChunk, onSelectChapter }: Props) {
  const baseName = d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "").replace(/\.[^.]+$/, "");
  const hasSegments = d.transcriptSegments.length > 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const searchRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const q = searchQuery.trim().toLowerCase();
  const matchIndices = q ? d.transcriptSegments
    .map((seg, i) => (seg.text.toLowerCase().includes(q) ? i : -1))
    .filter(i => i >= 0) : [];

  useEffect(() => { setMatchCursor(0); }, [searchQuery]);
  useEffect(() => {
    if (matchIndices.length === 0) return;
    const idx = matchIndices[matchCursor % matchIndices.length];
    searchRefs.current[idx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchCursor, searchQuery]);

  return (
    <div style={cardStyle} className="p-3 flex flex-col gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
        Extracted from {d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "")}
      </span>
      {d.transcript && (
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: `${accent}99` }}>
              Transcript
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadText(`${baseName}-transcript.txt`, d.transcript ?? "")}
                className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                .txt
              </button>
              {hasSegments && (
                <button
                  onClick={() => downloadText(`${baseName}-transcript.srt`, buildSrt(d.transcriptSegments))}
                  title="Subtitle file with timestamps"
                  className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                  .srt
                </button>
              )}
            </div>
          </div>
          {d.chapters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {d.chapters.map((ch, i) => (
                <button key={i}
                  onClick={() => onSelectChapter(ch.time)}
                  className="text-[9px] px-1.5 py-0.5 rounded-full border transition-colors hover:bg-white/5"
                  style={{ borderColor: `${accent}30`, color: `${accent}cc` }}>
                  [{mmss(ch.time)}] {ch.label}
                </button>
              ))}
            </div>
          )}
          {hasSegments && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search transcript…"
                className="flex-1 text-[9px] px-2 py-1 rounded border bg-transparent outline-none"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
              />
              {q && (
                <>
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {matchIndices.length ? `${(matchCursor % matchIndices.length) + 1}/${matchIndices.length}` : "0"}
                  </span>
                  <button onClick={() => setMatchCursor(c => c - 1)} disabled={!matchIndices.length}
                    className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                    ↑
                  </button>
                  <button onClick={() => setMatchCursor(c => c + 1)} disabled={!matchIndices.length}
                    className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                    ↓
                  </button>
                </>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1 overflow-y-auto p-2 rounded-lg min-h-0"
            style={{ background: "rgba(255,255,255,0.02)", maxHeight: 160 }}>
            {hasSegments ? (
              d.transcriptSegments.map((seg, i) => {
                const isCurrentMatch = matchIndices.length > 0 && matchIndices[matchCursor % matchIndices.length] === i;
                return (
                  <p key={i}
                    ref={el => { onSegmentRef(i, el); searchRefs.current[i] = el; }}
                    className="text-[10px] leading-relaxed rounded px-1 -mx-1 transition-colors"
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      background: isCurrentMatch ? `${accent}33` : highlightedIndex === i ? `${accent}22` : "transparent",
                    }}>
                    <span style={{ color: `${accent}99` }}>[{mmss(seg.start)}]</span> {highlightMatches(seg.text, searchQuery, accent)}
                  </p>
                );
              })
            ) : (
              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {d.transcript}
              </p>
            )}
          </div>
        </div>
      )}
      {d.notableChunks.length === 0 ? (
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          No tables or figures were detected — only plain text.
        </p>
      ) : (
        d.notableChunks.map((c, i) => (
          <RagSourceCard key={i} source={d.source} text={c.text} score={1} accent={accent}
            chunkType={c.chunkType} page={c.page} hideConfidence
            onSelect={() => onSelectChunk(c.chunkType, c.page, c.text)}
          />
        ))
      )}
    </div>
  );
}