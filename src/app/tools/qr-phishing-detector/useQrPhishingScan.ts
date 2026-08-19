import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const SCAN_TIMEOUT_MS = 20_000;

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type QrResult = {
  data: string;
  isUrl: boolean;
  host: string | null;
  riskLevel: RiskLevel;
  reasons: string[];
};

export type ScanResult = {
  found: boolean;
  qrCodes: QrResult[];
};

type RawQr = { data: string; is_url: boolean; host?: string; risk_level: RiskLevel; reasons: string[] };

/** Pure local heuristic scan (OpenCV QR decode + URL structure checks) — no
 * ML model, no API key, no budget cost, and the decoded URL is never
 * fetched server-side. See mm_qr_phishing.py's module docstring for the
 * exact signals checked. */
export function useQrPhishingScan() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (imageB64: string) => {
    setScanning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-qr-phishing/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageB64 }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "request failed");
      if (data.error) throw new Error(data.error);
      setResult({
        found: !!data.found,
        qrCodes: (data.qr_codes as RawQr[]).map(q => ({
          data: q.data,
          isUrl: q.is_url,
          host: q.host ?? null,
          riskLevel: q.risk_level,
          reasons: q.reasons,
        })),
      });
    } catch (e) {
      setError(e instanceof Error && e.message !== "request failed" ? e.message : "Scan failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { scanning, result, error, scan, reset };
}
