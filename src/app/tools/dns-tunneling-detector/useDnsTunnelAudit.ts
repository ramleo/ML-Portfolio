import { useCallback, useState } from "react";
import { analyzeLog, analyzeSingleHost, type LogAnalysisResult, type SingleHostResult } from "./dnsTunnelHeuristics";

/** Pure client-side heuristic analysis — no network calls, no ML model.
 * See dnsTunnelHeuristics.ts for the actual detection logic and
 * userGuide.ts for the published technique this is based on. */
export function useDnsTunnelAudit() {
  const [logResult, setLogResult] = useState<LogAnalysisResult | null>(null);
  const [hostResult, setHostResult] = useState<SingleHostResult | null>(null);

  const runLog = useCallback((text: string) => {
    setLogResult(text.trim() ? analyzeLog(text) : null);
  }, []);

  const runHost = useCallback((host: string) => {
    setHostResult(host.trim() ? analyzeSingleHost(host.trim()) : null);
  }, []);

  const reset = useCallback(() => {
    setLogResult(null);
    setHostResult(null);
  }, []);

  return { logResult, hostResult, runLog, runHost, reset };
}
