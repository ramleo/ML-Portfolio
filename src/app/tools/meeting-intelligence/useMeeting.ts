"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

// Transcription (chunked Whisper) + diarization + one extraction pass can take a
// while on a longer clip; keep a generous ceiling. Lean scope is best on clips
// up to ~10 minutes — a very long meeting may exceed this or the proxy timeout.
const RUN_TIMEOUT_MS = 180_000;

export type ActionItem = { text: string; owner: string; due: string };
export type Topic = { title: string; timestamp: number };
export type Speaker = { label: string; talk_seconds: number };

export type MeetingResult = {
  ok: boolean;
  error?: string;
  summary?: string;
  decisions?: string[];
  action_items?: ActionItem[];
  topics?: Topic[];
  speakers?: Speaker[];
  transcript?: string;
  duration_seconds?: number;
};

/** Uploads a meeting/call recording (audio or video) as multipart form data to
 *  the meeting-intelligence endpoint and returns structured notes. Multipart,
 *  not base64 JSON, so a ~50MB file doesn't inflate ~33% past the body cap. */
export function useMeeting() {
  const [file, setFileState] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setFile = useCallback((f: File) => {
    setFileState(f);
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setFileState(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-meeting`, {
        method: "POST",
        body: form, // no Content-Type header — the browser sets the multipart boundary
        signal: controller.signal,
      }, { tool: "meeting-intelligence" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Analysis failed — try a shorter clip.");
      if (data && data.ok === false) throw new Error(data.error || "Could not process this recording.");
      setResult(data as MeetingResult);
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Timed out — this clip is likely too long for the lean tool. Try one under ~10 minutes."
        : err instanceof Error ? err.message : "Analysis failed — try again.";
      setError(msg);
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [file]);

  return { file, setFile, reset, run, running, result, error };
}
