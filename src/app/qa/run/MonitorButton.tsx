"use client";

import { useState } from "react";
import { ownerToken } from "../lib/modelChoice";

/** Testwright R8 — "Monitor this test" on a finished run. Owner-only: it appears
 *  only when an owner token is set (in Model → Owner), and that same token
 *  authorizes the create. Stores the test server-side so the scheduled workflow
 *  can re-run it as an uptime check; failures show on the dashboard. */
export function MonitorButton({ name, code, accent }: {
  name: string; code: string; accent: string;
}) {
  const token = ownerToken();
  const [interval, setInterval] = useState<"daily" | "hourly">("daily");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Visitors never see this — monitoring is owner-only (recurring CI cost).
  if (!token) return null;

  const create = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/qa-run/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-qa-owner-token": token },
        body: JSON.stringify({ action: "create", name, code, interval }),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.id) setMsg("Monitoring on — this test will re-run on schedule.");
      else if (d?.skipped) setMsg("Monitoring is disabled on local runs (production only).");
      else if (d?.needs_setup) setMsg("Run supabase/qa_monitors.sql once to enable monitoring.");
      else setMsg(d?.error || "Could not start monitoring.");
    } catch {
      setMsg("Could not start monitoring.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <select value={interval} onChange={(e) => setInterval(e.target.value as "daily" | "hourly")}
        className="rounded-lg px-2 py-1.5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
        <option value="daily">Daily</option>
        <option value="hourly">Hourly</option>
      </select>
      <button type="button" onClick={create} disabled={busy}
        className="font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-40"
        style={{ borderColor: accent, color: accent }}>
        {busy ? "Saving…" : "Monitor this test"}
      </button>
      {msg && <span style={{ color: "var(--text2)" }}>{msg}</span>}
    </div>
  );
}
