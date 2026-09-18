"use client";

import { useCallback, useState } from "react";
import { track, incrementQueryCount } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";
import { scan, type ScanResult } from "./detectors";

const MAX_CHARS = 200_000; // keep one scan snappy; larger pastes are truncated

/** Scans pasted text for secrets and PII, entirely in the browser. The text is
 *  never uploaded and never logged — only the fact that a scan ran, and the
 *  category counts, are logged (to close the client-side run-tracking gap). */
export function useSecretScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [truncated, setTruncated] = useState(false);

  const analyze = useCallback((text: string) => {
    const clipped = text.slice(0, MAX_CHARS);
    setTruncated(text.length > MAX_CHARS);
    const r = scan(clipped);
    setResult(r);
    incrementQueryCount("secret-scanner");
    // Counts only — never the matched values or the pasted text.
    track(EV.QUERY_RUN, { meta: { tool: "secret-scanner", ...r.counts } });
  }, []);

  const reset = useCallback(() => { setResult(null); setTruncated(false); }, []);

  return { result, truncated, analyze, reset };
}
