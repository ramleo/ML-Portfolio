"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 30_000;

export type MatchedString = { identifier: string; offset: number; matched_bytes_hex: string };
export type RuleMatch = { rule: string; description: string | null; strings: MatchedString[] };
export type ScanResult = { matches: RuleMatch[]; file_size: number; truncated: boolean };

export const EXAMPLE_CUSTOM_RULE = `rule MyTestRule {
    meta:
        description = "Flags files containing a specific marker string"
    strings:
        $marker = "SECRET_MARKER_XYZ"
    condition:
        $marker
}`;

/** Uploads a file for real YARA pattern-matching — either against the
 * backend's small built-in educational rule set, or a rule the user writes
 * themselves. See yara_scan.py's docstring for why the built-in set is
 * self-authored and disclosed as an educational demo, not a production
 * threat-intel feed, and for why custom-rule testing is the tool's more
 * important half (the real, everyday YARA workflow). */
export function useYaraScan() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setB64(dataUrl.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setB64(null);
    setResult(null);
    setError(null);
  }, []);

  const runRequest = useCallback(async (path: string, extraBody?: Record<string, string>) => {
    if (!b64) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: b64, ...extraBody }),
        signal: controller.signal,
      }, { tool: "yara-file-scanner" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Scan failed — try again in a moment.");
      setResult(data as ScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [b64]);

  const runBuiltin = useCallback(() => runRequest("/yara-scan/builtin"), [runRequest]);
  const runCustom = useCallback((ruleSource: string) => runRequest("/yara-scan/custom", { rule_source: ruleSource }), [runRequest]);

  return { fileName, setFile, reset, runBuiltin, runCustom, running, result, error };
}
