import { useCallback, useState } from "react";
import { trackToolRun } from "@/hooks/useAnalytics";
import { analyzeLog, analyzeSingleHost, type LogAnalysisResult, type SingleHostResult } from "./dnsTunnelHeuristics";

/** Pure client-side heuristic analysis — no network calls, no ML model.
 * See dnsTunnelHeuristics.ts for the actual detection logic and
 * userGuide.ts for the published technique this is based on. */
export function useDnsTunnelAudit() {
  const [logResult, setLogResult] = useState<LogAnalysisResult | null>(null);
  const [hostResult, setHostResult] = useState<SingleHostResult | null>(null);

  const runLog = useCallback((text: string) => {
    if (!text.trim()) { setLogResult(null); return; }
    setLogResult(analyzeLog(text));
    trackToolRun("dns-tunneling-detector", { mode: "log" });
  }, []);

  const runHost = useCallback((host: string) => {
    if (!host.trim()) { setHostResult(null); return; }
    setHostResult(analyzeSingleHost(host.trim()));
    trackToolRun("dns-tunneling-detector", { mode: "host" });
  }, []);

  const reset = useCallback(() => {
    setLogResult(null);
    setHostResult(null);
  }, []);

  return { logResult, hostResult, runLog, runHost, reset };
}
