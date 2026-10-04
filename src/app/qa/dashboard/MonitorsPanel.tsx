"use client";

import { useCallback, useEffect, useState } from "react";
import { ownerToken } from "../lib/modelChoice";
import { PASS, FAIL, ERR, PASS_TEXT, FAIL_TEXT, ERR_TEXT } from "./dashboardCharts";

/** Testwright R8 — the owner's scheduled monitors: last status, when it last ran,
 *  failure streak, enable/disable and delete. Owner-only (needs the owner token),
 *  so it renders nothing for visitors. Data comes from GET /api/qa-run/monitor. */
type Monitor = {
  id: string; name: string; interval: string; enabled: boolean;
  last_status: string | null; last_run_at: string | null; consecutive_failures: number;
};

const CARD: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)" };

function statusTone(s: string | null): { bg: string; fg: string; text: string } {
  if (s === "passed") return { bg: `${PASS}22`, fg: PASS, text: PASS_TEXT };
  if (s === "failed") return { bg: `${FAIL}22`, fg: FAIL, text: FAIL_TEXT };
  if (s === "flaky") return { bg: `${ERR}22`, fg: ERR, text: ERR_TEXT };
  if (s === "error") return { bg: `${ERR}22`, fg: ERR, text: ERR_TEXT };
  return { bg: "var(--surface)", fg: "var(--text3)", text: "var(--text3)" };
}

function ago(ts: string | null): string {
  if (!ts) return "never run";
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MonitorsPanel({ accent }: { accent: string }) {
  const token = ownerToken();
  const [monitors, setMonitors] = useState<Monitor[] | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/qa-run/monitor", { headers: { "x-qa-owner-token": token }, cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (d?.needs_setup) { setNeedsSetup(true); setMonitors([]); return; }
      setMonitors(Array.isArray(d?.monitors) ? d.monitors : []);
    } catch { setMonitors([]); }
  }, [token]);

  // Fetch the monitors once on mount (and when the token changes); the setState
  // happens asynchronously after the request, which is the intended use of an effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const act = async (body: Record<string, unknown>) => {
    if (!token) return;
    await fetch("/api/qa-run/monitor", {
      method: "POST", headers: { "Content-Type": "application/json", "x-qa-owner-token": token },
      body: JSON.stringify(body),
    }).catch(() => null);
    void load();
  };

  if (!token) return null; // visitors / non-owners never see monitoring

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text2)" }}>Monitors</span>
        <button onClick={() => void load()} className="text-[11px] px-2.5 py-1 rounded-md border"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Refresh</button>
      </div>

      {needsSetup && (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          Run <code>supabase/qa_monitors.sql</code> once in the Supabase SQL editor to enable monitoring.
        </p>
      )}
      {!needsSetup && monitors && monitors.length === 0 && (
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          No monitors yet — open a passed run and choose <span className="font-semibold">Monitor this test</span>.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {(monitors ?? []).map((m) => {
          const t = statusTone(m.last_status);
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 flex-wrap rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{m.name || "Untitled test"}</p>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                  {m.interval} · {ago(m.last_run_at)}
                  {m.consecutive_failures > 0 && <span style={{ color: FAIL_TEXT }}> · {m.consecutive_failures} fail{m.consecutive_failures === 1 ? "" : "s"} in a row</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold uppercase px-2 py-0.5 rounded-md" style={{ background: t.bg, color: t.text }}>
                  {m.last_status || "pending"}
                </span>
                <button onClick={() => act({ action: "toggle", id: m.id, enabled: !m.enabled })}
                  className="text-[11px] px-2 py-1 rounded-md border"
                  style={{ borderColor: "var(--border)", color: m.enabled ? accent : "var(--text3)" }}>
                  {m.enabled ? "On" : "Off"}
                </button>
                <button onClick={() => act({ action: "delete", id: m.id })}
                  className="text-[11px] px-2 py-1 rounded-md border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
