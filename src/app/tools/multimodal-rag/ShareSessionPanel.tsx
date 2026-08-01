"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

type ShareInfo = { token: string; expiresAt: number };

export default function ShareSessionPanel({ sessionId, accent }: { sessionId: string; accent: string }) {
  const [warnOpen, setWarnOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);

  if (!sessionId) return null;

  const createLink = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/share-session`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const d = await res.json();
      setShare({ token: d.token, expiresAt: d.expires_at });
      setWarnOpen(false);
    } catch { /* best-effort — user can retry */ }
    setCreating(false);
  };

  const revoke = async () => {
    if (!share) return;
    setRevoking(true);
    try {
      await fetch(`${ML_UNIFIED_API}/rag/revoke-share`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: share.token, session_id: sessionId }),
      });
    } catch { /* best-effort */ }
    setShare(null);
    setRevoking(false);
  };

  const copyLink = () => {
    if (!share) return;
    const url = `${window.location.origin}${window.location.pathname}?share=${share.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (share) {
    const url = `${typeof window !== "undefined" ? window.location.origin + window.location.pathname : ""}?share=${share.token}`;
    const expiresIn = Math.max(0, Math.round((share.expiresAt * 1000 - Date.now()) / 3_600_000));
    return (
      <div className="flex items-center gap-1.5 flex-wrap text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
        <input readOnly value={url} onFocus={e => e.target.select()}
          className="flex-1 min-w-[160px] bg-transparent px-2 py-1 rounded border outline-none"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }} />
        <button onClick={copyLink} className="px-2 py-1 rounded border transition-colors"
          style={{ borderColor: `${accent}40`, color: accent }}>
          {copied ? "Copied" : "Copy"}
        </button>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>Expires in ~{expiresIn}h</span>
        <button onClick={revoke} disabled={revoking} className="px-2 py-1 rounded border transition-colors"
          style={{ borderColor: "rgba(239,68,68,0.4)", color: "#f87171", opacity: revoking ? 0.5 : 1 }}>
          Revoke
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setWarnOpen(true)}
        className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
        Share this session
      </button>
      {warnOpen && (
        <div className="absolute z-10 top-full mt-1.5 left-0 w-72 p-3 rounded-lg text-[12px] leading-relaxed"
          style={{ background: "#1a1a24", border: "1px solid rgba(245,158,11,0.3)", color: "rgba(255,255,255,0.7)" }}>
          <p className="mb-2">
            Whoever opens this link first locks it to their network — forwarding it to someone
            else after that won&apos;t work. Detected personal data (email/phone/SSN/card number)
            is hidden from them either way. The link works for 24 hours or until you revoke it.
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setWarnOpen(false)} className="px-2 py-1 rounded"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              Cancel
            </button>
            <button onClick={createLink} disabled={creating} className="px-2 py-1 rounded border"
              style={{ borderColor: `${accent}40`, color: accent, opacity: creating ? 0.5 : 1 }}>
              {creating ? "Creating…" : "Create link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}