import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const SCAN_TIMEOUT_MS = 15_000;

export type TlsInfo = {
  connected: boolean;
  protocol: string | null;
  cipher: string | null;
  verified: boolean;
  verify_error: string | null;
  subject: string | null;
  issuer: string | null;
  not_after: string | null;
  days_until_expiry: number | null;
  expired: boolean | null;
  deprecated_protocol: boolean;
};

export type HeadersInfo = {
  reachable: boolean;
  status_code: number | null;
  raw: Record<string, string>;
  content_security_policy: boolean;
  strict_transport_security: boolean;
  x_frame_options: boolean;
  x_content_type_options: boolean;
  referrer_policy: boolean;
  permissions_policy: boolean;
};

export type ScanResult =
  | { host: string; blocked: true; reason: string }
  | { host: string; blocked: false; tls: TlsInfo; headers: HeadersInfo; warnings: string[]; verdict: string };

export function useTlsHeadersScan() {
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
      const res = await trackedFetch(`${ML_UNIFIED_API}/tls-headers/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: host.trim() }),
        signal: controller.signal,
      }, { tool: "tls-security-headers-scanner" });
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
