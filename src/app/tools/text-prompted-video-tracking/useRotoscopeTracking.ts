import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const TRACK_TIMEOUT_MS = 120_000;

export type RotoscopeResult = { frames: string[]; fps_used: number; frame_count: number; warnings: string[] };

export function useRotoscopeTracking() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RotoscopeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const track = useCallback(async (video: File, textPrompt: string) => {
    if (!video || !textPrompt.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRACK_TIMEOUT_MS);
    try {
      const fd = new FormData();
      fd.append("video", video);
      fd.append("text_prompt", textPrompt.trim());
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-rotoscope/track`, {
        method: "POST", body: fd, signal: controller.signal,
      }, { tool: "text-prompted-video-tracking" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Tracking failed.");
      setResult(data as RotoscopeResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out — try a shorter clip." : (err as Error).message || "Tracking failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { track, running, result, error, reset };
}
