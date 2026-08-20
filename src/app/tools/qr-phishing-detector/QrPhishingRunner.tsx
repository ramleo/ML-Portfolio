"use client";

import { useRef, useState } from "react";
import { useQrPhishingScan, type RiskLevel } from "./useQrPhishingScan";
import QrScanHistory from "./QrScanHistory";
import { downloadCsv, scanEntriesToRows, ExportCsvButton } from "./QrPhishingCsv";

const LOW_COLOR = "#34d399";
const MEDIUM_COLOR = "#fbbf24";
const HIGH_COLOR = "#f87171";
const ERROR_COLOR = "#f87171";

const RISK_COLOR: Record<RiskLevel, string> = { low: LOW_COLOR, medium: MEDIUM_COLOR, high: HIGH_COLOR, unknown: "var(--text3)" };
const RISK_LABEL: Record<RiskLevel, string> = { low: "Low risk", medium: "Medium risk", high: "High risk", unknown: "Not a URL" };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Upload one or more photos/screenshots containing a QR code → decode each
 * locally (OpenCV) → score the decoded URL's structure for phishing/
 * malicious-link signals — or skip the photo entirely and type/paste a URL
 * directly, for a link received some other way. Never visits the decoded
 * link — pure text analysis, see mm_qr_phishing.py's docstring for why
 * that's safe by construction. Photos are scanned in parallel, each
 * rendered as its own result card as soon as it finishes. */
export default function QrPhishingRunner({ accent }: { accent: string }) {
  const { entries, scanFiles, checkUrl, reset, restoreFromHistory } = useQrPhishingScan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");

  const onFilesSelected = async (files: FileList) => {
    reset();
    const arr = Array.from(files);
    const prepared = await Promise.all(arr.map(async file => {
      const dataUrl = await readFileAsDataUrl(file);
      return { fileName: file.name, preview: dataUrl, b64: dataUrl.split(",")[1] ?? "" };
    }));
    scanFiles(prepared);
  };

  const onCheckUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    checkUrl(url);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload one or more photos/screenshots containing a QR code — a poster, flyer, parking sign, or a
          screenshot of one you received. Each is decoded and its destination URL is checked for structural
          phishing signals using local heuristics only — no ML model, no API cost, and the link is never
          actually visited.
        </p>

        <button onClick={() => fileInputRef.current?.click()}
          className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
          style={{ background: accent, color: "#0b0b12" }}>
          Choose photo{"(s)"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ""; }} />

        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-xs shrink-0" style={{ color: "var(--text3)" }}>or check a URL directly:</span>
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onCheckUrl(); }}
            placeholder="https://example.com/..."
            className="flex-1 text-sm rounded-lg px-3 py-1.5 min-w-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text)" }} />
          <button onClick={onCheckUrl} disabled={!urlInput.trim()}
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border shrink-0"
            style={{ borderColor: `${accent}50`, color: accent, opacity: urlInput.trim() ? 1 : 0.5 }}>
            Check URL
          </button>
        </div>
      </div>

      {entries.length === 0 && <QrScanHistory onRestore={restoreFromHistory} />}

      {entries.map(entry => (
        <div key={entry.id} style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {entry.preview && (
              <img src={entry.preview} alt="" className="rounded-lg object-cover shrink-0" style={{ width: 48, height: 48 }} />
            )}
            <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{entry.fileName}</span>
            {entry.scanning && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{entry.preview ? "Scanning…" : "Checking…"}</span>}
          </div>

          {entry.error && <p className="text-xs" style={{ color: ERROR_COLOR }}>{entry.error}</p>}

          {entry.result && !entry.result.found && (
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              No QR code found in this image — try a clearer, more direct shot of just the code.
            </p>
          )}

          {entry.result && entry.result.found && entry.result.qrCodes.some(q => q.isUrl) && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {entry.result.reputationChecked
                ? "Also checked against Google Safe Browsing's known-threat database."
                : "Structural heuristics only — Google Safe Browsing reputation check unavailable."}
            </p>
          )}

          {entry.result?.qrCodes.map((qr, i) => (
            <div key={i} className="rounded-lg p-4" style={{ border: `1px solid ${RISK_COLOR[qr.riskLevel]}35` }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="text-sm font-bold" style={{ color: RISK_COLOR[qr.riskLevel] }}>
                  {RISK_LABEL[qr.riskLevel]}
                </span>
                {qr.host && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{qr.host}</span>}
              </div>
              <p className="text-[11px] mb-2 break-all" style={{ color: "var(--text3)" }}>{qr.data}</p>
              {!qr.isUrl && (
                <p className="text-[11px] mb-2" style={{ color: "var(--text3)" }}>
                  {qr.payloadLabel} — not a link, so there&apos;s no destination to check.
                </p>
              )}
              {qr.reasons.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {qr.reasons.map((r, j) => (
                    <li key={j} className="text-[11px]" style={{ color: RISK_COLOR[qr.riskLevel] }}>• {r}</li>
                  ))}
                </ul>
              )}
              {qr.riskLevel === "low" && (
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                  No structural red flags found — this is a signal, not a guarantee the destination is safe.
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      {entries.some(e => e.result?.found) && (
        <div className="self-center">
          <ExportCsvButton onClick={() => downloadCsv(`qr-phishing-scan-${Date.now()}.csv`, scanEntriesToRows(entries))} />
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
          These are structural red flags in the link itself, not a verdict — a &quot;high risk&quot; link is worth
          real suspicion, but a &quot;low risk&quot; link can still lead somewhere malicious in ways this can&apos;t see
          (e.g. a freshly-registered but plausible-looking domain). When in doubt, don&apos;t scan unfamiliar
          QR codes in public places, and never enter credentials/payment details after following one.
        </p>
      )}
    </div>
  );
}
