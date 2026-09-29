"use client";

import { useEffect, useRef, useState } from "react";
import { useMeeting, type MeetingResult } from "./useMeeting";
import MeetingQA from "./MeetingQA";

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5 border-b text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
        {title}{count != null ? ` (${count})` : ""}
      </div>
      {children}
    </div>
  );
}

function Results({ r, accent, file }: { r: MeetingResult; accent: string; file: File | null }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const maxTalk = Math.max(1, ...(r.speakers ?? []).map((s) => s.talk_seconds));

  // The uploaded file is still in memory, so we can play it back locally (no
  // upload, no storage) and let the timestamps seek it. Create the object URL
  // inside the effect and revoke the same one in its cleanup: under React
  // StrictMode's mount→cleanup→mount, each run owns and revokes its own URL, and
  // the final render keeps a valid one — a useMemo URL revoked by a separate
  // cleanup would leave the <audio> pointing at a revoked blob (ERR_FILE_NOT_FOUND).
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setMediaUrl(null); return; }
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const isVideo = !!file && file.type.startsWith("video");
  const playerRef = useRef<HTMLMediaElement>(null);
  const seek = (t: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.currentTime = t;
    p.play().catch(() => { /* autoplay may be blocked; the seek still applies */ });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: `1px solid ${accent}44` }}>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full"
            style={{ background: `${accent}1e`, color: accent, border: `1px solid ${accent}55` }}>Summary</span>
          <span className="text-[11px] ml-auto px-2 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--text3)" }}>
            {mmss(r.duration_seconds ?? 0)} · {(r.speakers ?? []).length} speaker{(r.speakers ?? []).length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
          {r.summary || "No summary could be extracted."}
        </p>
      </div>

      {mediaUrl && (
        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {isVideo ? (
            <video ref={playerRef as React.Ref<HTMLVideoElement>} src={mediaUrl} controls className="w-full rounded-lg" />
          ) : (
            <audio ref={playerRef as React.Ref<HTMLAudioElement>} src={mediaUrl} controls className="w-full" />
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Decisions" count={(r.decisions ?? []).length}>
          {(r.decisions ?? []).length ? (
            <ul>
              {r.decisions!.map((d, i) => (
                <li key={i} className="px-4 py-2.5 text-[13px] border-b last:border-0" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>{d}</li>
              ))}
            </ul>
          ) : <p className="px-4 py-3 text-[12px]" style={{ color: "var(--text3)" }}>None stated.</p>}
        </Section>

        <Section title="Action items" count={(r.action_items ?? []).length}>
          {(r.action_items ?? []).length ? (
            <ul>
              {r.action_items!.map((a, i) => (
                <li key={i} className="px-4 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[13px]" style={{ color: "var(--text)" }}>{a.text}</p>
                  {(a.owner || a.due) && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>
                      {a.owner && <span>owner: <span style={{ color: accent }}>{a.owner}</span></span>}
                      {a.owner && a.due ? " · " : ""}
                      {a.due && <span>due: {a.due}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-3 text-[12px]" style={{ color: "var(--text3)" }}>None stated.</p>}
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Agenda" count={(r.topics ?? []).length}>
          {(r.topics ?? []).length ? (
            <ul>
              {r.topics!.map((t, i) => (
                <li key={i} className="flex gap-3 px-4 py-2.5 text-[13px] border-b last:border-0" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
                  <button onClick={() => seek(t.timestamp)} disabled={!mediaUrl} title="Jump to this point" data-ev="transcript-seek"
                    className="font-mono text-[11px] shrink-0 underline decoration-dotted underline-offset-2 disabled:no-underline disabled:cursor-default"
                    style={{ color: accent }}>{mmss(t.timestamp)}</button>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-3 text-[12px]" style={{ color: "var(--text3)" }}>No distinct topics detected.</p>}
        </Section>

        <Section title="Talk time">
          <div className="px-4 py-3 flex flex-col gap-2">
            {(r.speakers ?? []).map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: "var(--text)" }}>{s.label}</span>
                  <span style={{ color: "var(--text3)" }}>{mmss(s.talk_seconds)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(s.talk_seconds / maxTalk) * 100}%`, background: accent }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Transcript">
        <div className="px-4 py-3">
          <button onClick={() => setShowTranscript((v) => !v)} data-ev="toggle-transcript" className="text-[12px] font-semibold" style={{ color: accent }}>
            {showTranscript ? "Hide" : "Show"} full transcript
          </button>
          {showTranscript && (
            <div className="mt-3 max-h-96 overflow-y-auto flex flex-col gap-1">
              {(r.transcript ?? "").split("\n").map((line, i) => {
                const m = line.match(/^\[(\d+):(\d+)\]\s*(.*)$/);
                if (!m) {
                  return <p key={i} className="text-[12px] leading-relaxed m-0" style={{ color: "var(--text2)" }}>{line}</p>;
                }
                const t = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                return (
                  <p key={i} className="text-[12px] leading-relaxed m-0" style={{ color: "var(--text2)" }}>
                    <button onClick={() => seek(t)} disabled={!mediaUrl} title="Jump to this point" data-ev="transcript-seek"
                      className="font-mono text-[11px] mr-2 underline decoration-dotted underline-offset-2 disabled:no-underline disabled:cursor-default"
                      style={{ color: accent }}>{m[1]}:{m[2]}</button>
                    {m[3]}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {r.transcript && <MeetingQA transcript={r.transcript} accent={accent} />}
    </div>
  );
}

export default function MeetingRunner({ accent }: { accent: string }) {
  const { file, setFile, reset, run, running, progress, result, error } = useMeeting();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Upload a meeting or call recording.</span>{" "}
        It transcribes the audio, labels the speakers, and pulls out a summary, the decisions made, and the
        action items — plus an agenda and who spoke how long. Best on clips up to ~10 minutes.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <input ref={inputRef} type="file" accept="audio/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} className="hidden" />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => inputRef.current?.click()}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg" style={{ background: accent, color: "#fff" }}>
            Choose recording
          </button>
          <button onClick={run} disabled={!file || running}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: file ? accent : "var(--surface)", color: file ? "#fff" : "var(--text3)" }}>
            {running ? "Analyzing…" : "Analyze meeting"}
          </button>
          {file && (
            <button onClick={() => { reset(); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>Clear</button>
          )}
          {file && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{file.name}</span>}
        </div>
        {running && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text2)" }}>
            <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: accent }} />
            <span>{progress ?? "Working…"}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>{error}</div>
      )}

      {result && result.ok && <Results r={result} accent={accent} file={file} />}
    </div>
  );
}
