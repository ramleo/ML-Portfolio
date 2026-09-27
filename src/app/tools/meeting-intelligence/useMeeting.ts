"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

// Hard ceiling. The stream emits heartbeats so the connection stays alive during
// a long transcription; this only fires if something genuinely hangs.
const RUN_TIMEOUT_MS = 300_000;

const STEP_LABELS: Record<string, string> = {
  transcribe: "Transcribing & labelling speakers…",
  agenda: "Building the agenda…",
  extract: "Extracting summary & action items…",
};

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

/** Uploads a recording to the streaming meeting endpoint and consumes the SSE
 *  progress events, so a long meeting shows live step progress and the
 *  connection never sits idle long enough to hit the proxy timeout. */
export function useMeeting() {
  const [file, setFileState] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
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
    setProgress(null);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress("Uploading…");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-meeting/stream`, {
        method: "POST",
        body: form, // no Content-Type — the browser sets the multipart boundary
        signal: controller.signal,
      }, { tool: "meeting-intelligence", streaming: true });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Analysis failed — try a shorter clip.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: MeetingResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep any incomplete trailing event
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let evt: { error?: string; step?: string; status?: string; result?: MeetingResult };
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (evt.error) throw new Error(evt.error);
          if (evt.step === "done" && evt.result) finalResult = evt.result;
          else if (evt.step && evt.status === "running") setProgress(STEP_LABELS[evt.step] ?? "Working…");
        }
      }

      if (!finalResult) throw new Error("The analysis ended without a result — try again.");
      setResult(finalResult);
    } catch (err) {
      const msg = err instanceof Error && err.name === "AbortError"
        ? "Timed out — this clip is likely too long. Try one under ~10 minutes."
        : err instanceof Error ? err.message : "Analysis failed — try again.";
      setError(msg);
    } finally {
      clearTimeout(timeout);
      setRunning(false);
      setProgress(null);
    }
  }, [file]);

  return { file, setFile, reset, run, running, progress, result, error };
}
