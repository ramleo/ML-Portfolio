import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const SCAN_TIMEOUT_MS = 25_000;

export type ExposedPath = { path: string; status_code: number };
export type OpenPort = { port: number; service: string; open: boolean };
export type CmsInfo = { generator: string };

export type ScanResult =
  | { host: string; blocked: true; reason: string }
  | {
      host: string;
      blocked: false;
      exposed_paths: ExposedPath[];
      directory_listings: string[];
      cms: CmsInfo | null;
      open_ports: OpenPort[];
      findings: string[];
    };

export function useAttackSurfaceScan() {
  const [host, setHost] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!host.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/attack-surface/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: host.trim() }),
        signal: controller.signal,
      }, { tool: "attack-surface-scanner" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Scan failed.");
      setResult(data as ScanResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out." : (err as Error).message || "Scan failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [host]);

  const reset = useCallback(() => {
    setHost("");
    setResult(null);
    setError(null);
  }, []);

  return { host, setHost, scan, running, result, error, reset };
}
