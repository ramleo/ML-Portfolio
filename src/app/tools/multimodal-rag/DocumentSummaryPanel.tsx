"use client";

import { useEffect, useRef, useState } from "react";
import RagSourceCard from "@/components/RagSourceCard";
import SearchableTextPanel from "./SearchableTextPanel";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox, DetectedObject, Entity, IngestState, TranscriptSegment } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;

type Props = {
  doc: Doc;
  accent: string;
  cardStyle: React.CSSProperties;
  highlightedIndex: number | null;
  /** Same jump-to-and-highlight behavior as highlightedIndex, but for the
   * "Extracted text" list (non-video/audio documents have no transcript). */
  highlightedTextIndex: number | null;
  /** Real seconds to seek the video/audio player to directly (MMRAG-09) —
   * for a visual-only frame citation, which has no transcript segment to
   * highlight via highlightedIndex above. Null otherwise. */
  seekTime: number | null;
  onSegmentRef: (i: number, el: HTMLParagraphElement | null) => void;
  onTextSegmentRef: (i: number, el: HTMLParagraphElement | null) => void;
  onSelectChunk: (chunkType: string | null | undefined, page: number | null | undefined, text: string, bbox?: Bbox | null, objects?: DetectedObject[] | null, timestampS?: number | null, piiTypes?: string | null, entities?: Entity[] | null) => void;
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

export default function DocumentSummaryPanel({ doc: d, accent, cardStyle, highlightedIndex, highlightedTextIndex, seekTime,
                                               onSegmentRef, onTextSegmentRef, onSelectChunk, onSelectChapter }: Props) {
  const baseName = d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "").replace(/\.[^.]+$/, "");
  const hasSegments = d.transcriptSegments.length > 0;

  // HTMLVideoElement and HTMLAudioElement both extend HTMLMediaElement —
  // one ref/one set of effects drives seek-to-segment and replay-tracking
  // for either a <video> or an <audio> element.
  const videoRef = useRef<HTMLMediaElement>(null);
  const isVideo = (d.summary.video ?? 0) > 0;
  // Only video/audio uploads ever produce transcriptSegments — no separate
  // fileType field needed to tell them apart from a PDF/image/CSV.
  const isAudio = hasSegments && !isVideo;
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

  // A visual-only frame citation (MMRAG-09) has no transcript segment to
  // key off of — it carries its own real timestamp instead, seeked here
  // directly rather than through the segment-index path above.
  useEffect(() => {
    if (seekTime === null || !videoRef.current) return;
    videoRef.current.currentTime = seekTime;
  }, [seekTime]);

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

  return (
    <div style={cardStyle} className="p-3 flex flex-col gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
        Extracted from {d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "")}
      </span>
      {isVideo && (
        <video ref={videoRef as React.RefObject<HTMLVideoElement>} controls preload="metadata" className="w-full rounded-lg"
          style={{ maxHeight: 220, background: "#000" }}
          src={`${ML_UNIFIED_API}/rag/video/${encodeURIComponent(d.source)}`} />
      )}
      {isAudio && (
        <>
          {/* Same /rag/video/{source} endpoint — it serves raw bytes + the
              stored content_type generically, no audio-specific route needed. */}
          <audio ref={videoRef as React.RefObject<HTMLAudioElement>} controls preload="metadata" className="w-full"
            src={`${ML_UNIFIED_API}/rag/video/${encodeURIComponent(d.source)}`} />
          <div className="flex items-center gap-1"
            title="This transcribes speech only. Music or instrumental audio has no speech to transcribe — Whisper may still return a hallucinated (made-up) transcript for it instead of describing the sound.">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
              <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 19.66h18a1 1 0 00.89-1.62L13.71 3.86a1 1 0 00-1.72 0z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Speech only — music/instrumental audio may transcribe inaccurately
            </span>
          </div>
        </>
      )}
      {(isVideo || isAudio) && duration > 0 && replayCounts.some(c => c > 0) && (() => {
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
          {hasSegments ? (
            <SearchableTextPanel
              placeholder="Search transcript…"
              accent={accent}
              highlightedKey={highlightedIndex}
              onSelect={(isVideo || isAudio) ? (key) => {
                const seg = d.transcriptSegments[key as number];
                if (videoRef.current && seg) videoRef.current.currentTime = seg.start;
              } : undefined}
              itemRef={(key, el) => onSegmentRef(key as number, el)}
              items={d.transcriptSegments.map((seg, i) => ({
                key: i,
                prefix: `[${mmss(seg.start)}] ${seg.speaker ? `${seg.speaker}: ` : ""}`,
                text: seg.text,
              }))}
            />
          ) : (
            <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              {d.transcript}
            </p>
          )}
        </div>
      )}
      {d.textSegments.length > 0 && (
        <div className="flex flex-col gap-1 mb-1">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: `${accent}99` }}>
            Extracted text
          </span>
          <SearchableTextPanel
            placeholder="Search document text…"
            accent={accent}
            highlightedKey={highlightedTextIndex}
            itemRef={(key, el) => onTextSegmentRef(key as number, el)}
            onSelect={(key) => {
              const seg = d.textSegments[key as number];
              if (seg) onSelectChunk("text", seg.page, seg.text);
            }}
            items={d.textSegments.map((seg, i) => ({
              key: i,
              prefix: seg.page ? `Page ${seg.page} — ` : undefined,
              text: seg.text,
            }))}
          />
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
            blurry={c.blurry}
            onSelect={() => onSelectChunk(c.chunkType, c.page, c.text, c.bbox, c.objects, c.timestampS, c.piiTypes, c.entities)}
          />
        ))
      )}
    </div>
  );
}