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
  reputationChecked: boolean;
};

export type ScanEntry = {
  id: string;
  fileName: string;
  preview: string;
  scanning: boolean;
  result: ScanResult | null;
  error: string | null;
};

type RawQr = { data: string; is_url: boolean; host?: string; risk_level: RiskLevel; reasons: string[] };

async function scanOne(imageB64: string): Promise<ScanResult> {
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
    return {
      found: !!data.found,
      qrCodes: (data.qr_codes as RawQr[]).map(q => ({
        data: q.data,
        isUrl: q.is_url,
        host: q.host ?? null,
        riskLevel: q.risk_level,
        reasons: q.reasons,
      })),
      reputationChecked: !!data.reputation_checked,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Pure local heuristic scan (OpenCV QR decode + URL structure checks) — no
 * ML model, no API key, no budget cost, and the decoded URL is never
 * fetched server-side. See mm_qr_phishing.py's module docstring for the
 * exact signals checked. Scans a batch of photos in parallel, one entry per
 * photo, so uploading several QR images at once shows each result as soon
 * as its own scan finishes rather than waiting for the slowest one. */
export function useQrPhishingScan() {
  const [entries, setEntries] = useState<ScanEntry[]>([]);

  const scanFiles = useCallback((files: { fileName: string; preview: string; b64: string }[]) => {
    const newEntries: ScanEntry[] = files.map(f => ({
      id: `${f.fileName}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: f.fileName,
      preview: f.preview,
      scanning: true,
      result: null,
      error: null,
    }));
    setEntries(newEntries);

    newEntries.forEach((entry, i) => {
      scanOne(files[i].b64)
        .then(result => {
          setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, scanning: false, result } : e)));
        })
        .catch(err => {
          const message = err instanceof Error && err.message !== "request failed" ? err.message : "Scan failed — try again in a moment.";
          setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, scanning: false, error: message } : e)));
        });
    });
  }, []);

  const reset = useCallback(() => setEntries([]), []);

  return { entries, scanFiles, reset };
}
