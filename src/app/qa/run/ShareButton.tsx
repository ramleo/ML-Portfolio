"use client";

import { useState } from "react";
import type { RunState } from "./useRun";
import { createShare } from "./shareReport";

/** Testwright R7 — "Share" on a finished run: creates an unguessable permalink to a
 *  read-only report. The test code is included only if the user ticks the toggle. */
export function ShareButton({ state, name, code, accent }: {
  state: RunState;
  name: string;
  code: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const [includeCode, setIncludeCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true); setMsg(null);
    const r = await createShare(state, name, includeCode, code);
    setBusy(false);
    if (r.id) {
      setUrl(`${window.location.origin}/qa/run/r/${r.id}`);
    } else if (r.skipped) {
      setMsg("Sharing is disabled on local runs (production only).");
    } else if (r.needsSetup) {
      setMsg("Share storage isn't set up yet (run supabase/qa_shared_runs.sql).");
    } else {
      setMsg(r.error || "Could not create the link.");
    }
  };

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1.5"
        style={{ borderColor: `${accent}55`, color: accent }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" strokeLinecap="round" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl p-3 z-20 shadow-lg"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {!url ? (
            <>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--text)" }}>Share this report</p>
              <p className="text-[11px] mb-2.5" style={{ color: "var(--text3)" }}>
                Anyone with the link can view a read-only report (summary, failure reason, steps, timing). Link expires in 90 days.
              </p>
              <label className="flex items-center gap-2 text-[11px] mb-3 cursor-pointer" style={{ color: "var(--text2)" }}>
                <input type="checkbox" checked={includeCode} onChange={(e) => setIncludeCode(e.target.checked)} />
                Include the test code
              </label>
              <button onClick={create} disabled={busy}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50 w-full"
                style={{ background: accent, color: "#fff" }}>
                {busy ? "Creating link…" : "Create share link"}
              </button>
              {msg && <p className="text-[11px] mt-2" style={{ color: "#f59e0b" }}>{msg}</p>}
            </>
          ) : (
            <>
              <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--text)" }}>Link ready</p>
              <div className="flex items-center gap-1.5">
                <input readOnly value={url} onFocus={(e) => e.target.select()}
                  className="flex-1 text-[11px] px-2 py-1.5 rounded-lg font-mono"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }} />
                <button onClick={copy}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity shrink-0"
                  style={{ background: accent, color: "#fff" }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] underline mt-2 inline-block" style={{ color: accent }}>
                Open the report
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
