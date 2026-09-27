"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;

export type DescreenResult = {
  ok: boolean;
  error?: string;
  cleaned?: string; // base64 PNG, no data-URL prefix
  spectrum?: string; // base64 PNG (log-magnitude spectrum, notched peaks circled)
  removed?: number; // count of periodic frequency peaks removed
  width?: number;
  height?: number;
};

/** Uploads an image to the FFT descreen endpoint, which notches out periodic
 *  halftone/moire/scan-line peaks and inverts. Non-generative — see
 *  mm_descreen.py. Keeps the original b64 for a before/after comparison. */
export function useDescreen() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null); // b64, no prefix
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DescreenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setOriginal(dataUrl.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setOriginal(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!original) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-descreen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: original }),
        signal: controller.signal,
      }, { tool: "scan-descreen" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Descreen failed — try again in a moment.");
      if (data && data.ok === false) throw new Error(data.error || "Could not process this image.");
      setResult(data as DescreenResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Descreen failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [original]);

  return { fileName, original, setFile, reset, run, running, result, error };
}
