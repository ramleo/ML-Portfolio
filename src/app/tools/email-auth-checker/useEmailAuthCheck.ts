import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const CHECK_TIMEOUT_MS = 15_000;

export type AuthResultEntry = { raw: string; mechanisms: Record<string, string> };
export type DkimSignature = {
  selector: string;
  domain: string;
  algorithm: string;
  dns: { found: boolean; revoked: boolean | null };
};
export type SpfResult = { found: boolean; record: string | null; all_qualifier: string | null };
export type DmarcResult = {
  found: boolean;
  record: string | null;
  policy: string | null;
  subdomain_policy: string | null;
  pct: string | null;
};

export type EmailAuthResult = {
  from_domain: string | null;
  authentication_results: AuthResultEntry[];
  received_spf: string | null;
  dkim_signatures: DkimSignature[];
  spf: SpfResult;
  dmarc: DmarcResult;
  alignment: { dkim_aligned: boolean | null; spf_aligned: boolean | null };
  verdict: string;
  verdict_reason: string;
  warnings: string[];
};

export function useEmailAuthCheck() {
  const [rawHeaders, setRawHeaders] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EmailAuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!rawHeaders.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/email-auth/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_headers: rawHeaders }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Check failed.");
      setResult(data as EmailAuthResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out — DNS lookups took too long." : (err as Error).message || "Check failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [rawHeaders]);

  const reset = useCallback(() => {
    setRawHeaders("");
    setResult(null);
    setError(null);
  }, []);

  return { rawHeaders, setRawHeaders, check, running, result, error, reset };
}
