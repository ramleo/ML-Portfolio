"use client";

import { useEffect, useRef, useState } from "react";
import RagSourceCard from "@/components/RagSourceCard";
import { ML_UNIFIED_API } from "@/config/urls";
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
    `${i + 1}\n${srtTimestamp(seg.start)} --> ${srtTimestamp(seg.end)}\n${seg.speaker ? `${seg.speaker}: ` : ""}${seg.text}\n`
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

const REPLAY_BUCKETS = 32;
const KDE_GRID_POINTS = 100;

/** Kernel density estimate over the replay-bucket counts — treats each
 * bucket's count as that many point-samples at the bucket's center time,
 * then sums a Gaussian kernel per sample across a fine grid. Turns the
 * same sparse click/seek data into one smooth curve instead of discrete
 * bars — a rendering choice, not a change in what's actually measured. */
function computeKdeCurve(replayCounts: number[]): number[] {
  const bucketWidth = 1 / REPLAY_BUCKETS;
  const bandwidth = bucketWidth * 1.5;
  const grid = new Array(KDE_GRID_POINTS).fill(0);
  for (let g = 0; g < KDE_GRID_POINTS; g++) {
    const t = g / (KDE_GRID_POINTS - 1);
    let sum = 0;
    for (let b = 0; b < REPLAY_BUCKETS; b++) {
      const count = replayCounts[b];
      if (!count) continue;
      const bt = (b + 0.5) * bucketWidth;
      const z = (t - bt) / bandwidth;
      sum += count * Math.exp(-0.5 * z * z);
    }
    grid[g] = sum;
  }
  return grid;
}

export default function DocumentSummaryPanel({ doc: d, accent, cardStyle, highlightedIndex,
                                               onSegmentRef, onSelectChunk, onSelectChapter }: Props) {
  const baseName = d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "").replace(/\.[^.]+$/, "");
  const hasSegments = d.transcriptSegments.length > 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const searchRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = (d.summary.video ?? 0) > 0;
  const duration = hasSegments ? d.transcriptSegments[d.transcriptSegments.length - 1].end : 0;
  const [replayCounts, setReplayCounts] = useState<number[]>(() => new Array(REPLAY_BUCKETS).fill(0));

  // Seeks the actual video playback to whichever segment gets highlighted —
  // covers both a chapter click (below) and a transcript citation clicked
  // in the chat (the highlightedIndex prop, set by the parent either way).
  useEffect(() => {
    if (highlightedIndex === null || !videoRef.current) return;
    const seg = d.transcriptSegments[highlightedIndex];
    if (seg) videoRef.current.currentTime = seg.start;
  }, [highlightedIndex, d.transcriptSegments]);

  // Tracks which part of the video gets rewound-to-and-replayed within THIS
  // session/viewer only — the browser "seeked" event fires on an explicit
  // jump (scrubbing, clicking a transcript line/chapter), not on ordinary
  // linear playback, so a bucket's count reflects genuine re-watches of
  // that moment rather than just "played through once."
  useEffect(() => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const onSeeked = () => {
      const bucket = Math.min(REPLAY_BUCKETS - 1, Math.floor((v.currentTime / duration) * REPLAY_BUCKETS));
      setReplayCounts(counts => { const next = [...counts]; next[bucket] += 1; return next; });
    };
    v.addEventListener("seeked", onSeeked);
    return () => v.removeEventListener("seeked", onSeeked);
  }, [duration]);

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
      {isVideo && (
        <video ref={videoRef} controls preload="metadata" className="w-full rounded-lg"
          style={{ maxHeight: 220, background: "#000" }}
          src={`${ML_UNIFIED_API}/rag/video/${encodeURIComponent(d.source)}`} />
      )}
      {isVideo && duration > 0 && replayCounts.some(c => c > 0) && (() => {
        const curve = computeKdeCurve(replayCounts);
        const max = Math.max(...curve) || 1;
        const H = 20;
        const points = curve.map((v, g) => {
          const x = (g / (KDE_GRID_POINTS - 1)) * 100;
          const y = H - (v / max) * H;
          return `${x},${y}`;
        });
        const areaPath = `M0,${H} L${points.join(" L")} L100,${H} Z`;
        const linePath = `M${points.join(" L")}`;
        return (
          <div title="Parts of the video you've jumped back to and replayed in this session — resets when you leave.">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
              Your most re-watched moments (this session)
            </span>
            <div className="relative" style={{ height: 18 }}>
              <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                <path d={areaPath} fill={`${accent}44`} />
                <path d={linePath} fill="none" stroke={accent} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="absolute inset-0 flex">
                {replayCounts.map((c, i) => (
                  <div key={i}
                    onClick={() => { if (videoRef.current) videoRef.current.currentTime = (i / REPLAY_BUCKETS) * duration; }}
                    title={`${mmss((i / REPLAY_BUCKETS) * duration)} — replayed ${c}×`}
                    style={{ flex: 1, cursor: "pointer" }} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}
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
                    onClick={isVideo ? () => { if (videoRef.current) videoRef.current.currentTime = seg.start; } : undefined}
                    className="text-[10px] leading-relaxed rounded px-1 -mx-1 transition-colors"
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      background: isCurrentMatch ? `${accent}33` : highlightedIndex === i ? `${accent}22` : "transparent",
                      cursor: isVideo ? "pointer" : "default",
                    }}>
                    <span style={{ color: `${accent}99` }}>[{mmss(seg.start)}]</span>{" "}
                    {seg.speaker && <span style={{ color: `${accent}dd`, fontWeight: 600 }}>{seg.speaker}: </span>}
                    {highlightMatches(seg.text, searchQuery, accent)}
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
            chunkType={c.chunkType} page={c.page} hideConfidence numberMismatch={c.numberMismatch} piiTypes={c.piiTypes}
            onSelect={() => onSelectChunk(c.chunkType, c.page, c.text)}
          />
        ))
      )}
    </div>
  );
}