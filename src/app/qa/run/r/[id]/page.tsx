"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Result } from "../../ResultView";
import { fetchShare, rowToRunState, type SharedRunRow } from "../../shareReport";
import type { RunState } from "../../useRun";

const ACCENT = "#14b8a6";

/** Testwright R7 — read-only shared run report at /qa/run/r/[id].
 *  Fetches the stored row and renders the same <Result> the live Run uses, read-only. */
export default function SharedRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<RunState | null>(null);
  const [row, setRow] = useState<SharedRunRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchShare(id);
      if (!alive) return;
      if (r.row) { setRow(r.row); setState(rowToRunState(r.row)); }
      else setError(r.error || "This report could not be loaded.");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.7">
              <path d="M5 3l14 9-14 9V3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Shared run report</h1>
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>
              {row ? row.name || "(unnamed test)" : "Testwright"}
              {row && <> · {new Date(row.created_at).toLocaleString()}</>}
            </p>
          </div>
        </div>
        <Link href="/qa/run" className="text-[12px] px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: `${ACCENT}45`, color: ACCENT }}>
          Open Testwright
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl px-4 py-10 text-center text-[13px]"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text3)" }}>
          Loading report…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl px-4 py-8 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>Report unavailable</p>
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>{error}</p>
        </div>
      )}

      {!loading && state && (
        <>
          <Result state={state} accent={ACCENT} name={row?.name || "shared-run"} readOnly />
          {row?.code && (
            <div className="rounded-2xl overflow-hidden mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide px-4 py-2.5 border-b"
                style={{ color: "var(--text3)", borderColor: "var(--border)" }}>Test code</p>
              <pre className="text-[11px] font-mono overflow-x-auto px-4 py-3 m-0 leading-relaxed"
                style={{ color: "var(--text2)" }}>{row.code}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
