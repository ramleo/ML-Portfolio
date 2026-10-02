"use client";

import { useEffect, useState } from "react";
import { loadDashboard, type DashboardData, type Status } from "./dashboardData";
import { clearHistory } from "../run/storage";
import { Ring, TrendChart, useCountUp, useReducedMotion, PASS, FAIL, ERR } from "./dashboardCharts";

const statusColor = (s: Status) => (s === "passed" ? PASS : s === "failed" ? FAIL : ERR);
const statusLabel = (s: Status) => (s === "passed" ? "passed" : s === "failed" ? "failed" : "error");
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function CountTile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const n = useCountUp(value);
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: "var(--text)" }}>{Math.round(n)}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{sub}</p>}
    </div>
  );
}

function Bar({ pct, accent }: { pct: number; accent: string }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(reduced ? pct : 0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div className="h-full rounded-full" style={{
      width: `${w}%`, background: accent, minWidth: 4,
      transition: reduced ? undefined : "width 800ms cubic-bezier(.22,1,.36,1)",
    }} />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}

export default function RunDashboard({ accent }: { accent: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const reduced = useReducedMotion();
  const refresh = () => setData(loadDashboard());

  // Live: re-read local history on mount, when another tab writes it, on focus, and
  // on a gentle interval — so new runs appear without a manual refresh.
  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === "qa_run_history") refresh(); };
    const onVis = () => { if (!document.hidden) refresh(); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(id);
    };
  }, []);

  if (!data) return null;

  if (data.total === 0) {
    return (
      <div className="rounded-2xl px-5 py-10 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No runs yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--text3)" }}>
          Run a test in the Run stage and your history rolls up here — live. (Reads runs saved in this browser.)
        </p>
      </div>
    );
  }

  const maxFails = Math.max(1, ...data.topFailing.map((r) => r.fails));
  const card = { background: "var(--bg-card)", border: "1px solid var(--border)" };
  const label = "text-[11px] font-semibold uppercase tracking-wide mb-3";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] inline-flex items-center gap-2" style={{ color: "var(--text3)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PASS, animation: reduced ? undefined : "pulse 2s ease-in-out infinite" }} />
          Live · this browser&apos;s last {data.total} run{data.total === 1 ? "" : "s"}.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="text-[11px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Refresh</button>
          <button onClick={() => { clearHistory(); refresh(); }} className="text-[11px] px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Clear history</button>
        </div>
      </div>

      {/* Hero: pass-rate ring + headline numbers */}
      <div className="rounded-2xl p-5 flex items-center gap-6 flex-wrap" style={card}>
        <Ring rate={data.passRate} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 flex-1 min-w-[260px]">
          <CountTile label="Total runs" value={data.total} sub={`${data.totalTests} test cases`} />
          <CountTile label="Passed" value={data.passed} sub="runs" />
          <CountTile label="Failed" value={data.failed} sub={`${data.failedTests} failed tests`} />
          <CountTile label="Named tests" value={data.distinctTests} sub={data.errored ? `${data.errored} infra error${data.errored === 1 ? "" : "s"}` : "unique"} />
        </div>
      </div>

      {/* Pass-rate trend (drawn in) */}
      <div className="rounded-2xl p-4" style={card}>
        <p className={label} style={{ color: "var(--text3)" }}>Pass-rate trend (cumulative, oldest → newest)</p>
        <TrendChart sequence={data.sequence} accent={accent} />
      </div>

      {/* Per-run outcome strip (animated in) */}
      <div className="rounded-2xl p-4" style={card}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <p className={label + " mb-0"} style={{ color: "var(--text3)" }}>Outcomes over time</p>
          <div className="flex items-center gap-3">
            <LegendDot color={PASS} label="passed" /><LegendDot color={FAIL} label="failed" /><LegendDot color={ERR} label="error" />
          </div>
        </div>
        <div className="flex items-end gap-[2px]" style={{ height: 40 }}>
          {data.sequence.map((p, i) => (
            <div key={i} title={`${p.name} — ${statusLabel(p.status)} — ${fmtDate(p.at)}`}
              className="flex-1 rounded-sm" style={{
                background: statusColor(p.status), minWidth: 5, height: "100%",
                opacity: reduced ? 1 : 0, animation: reduced ? undefined : `rise 420ms ease-out ${i * 45}ms forwards`,
              }} />
          ))}
        </div>
      </div>

      {/* Top failing tests (animated bars) */}
      <div className="rounded-2xl p-4" style={card}>
        <p className={label} style={{ color: "var(--text3)" }}>Top failing tests</p>
        {data.topFailing.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>No failures recorded — every run passed.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.topFailing.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="text-[12px] truncate shrink-0" style={{ color: "var(--text2)", width: 170 }} title={r.name}>{r.name}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                  <Bar pct={(r.fails / maxFails) * 100} accent={accent} />
                </div>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color: "var(--text3)", width: 56 }}>{r.fails}/{r.total} fail</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flakiness table */}
      <div className="rounded-2xl p-4" style={card}>
        <p className={label} style={{ color: "var(--text3)" }}>Flaky tests (passed and failed across runs)</p>
        {data.flaky.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>None detected — no test both passed and failed.</p>
        ) : (
          <table className="w-full text-[12px]" style={{ color: "var(--text2)" }}>
            <thead>
              <tr style={{ color: "var(--text3)" }}>
                <th className="text-left font-semibold pb-1.5">Test</th>
                <th className="text-right font-semibold pb-1.5" style={{ width: 80 }}>Passed</th>
                <th className="text-right font-semibold pb-1.5" style={{ width: 80 }}>Failed</th>
              </tr>
            </thead>
            <tbody>
              {data.flaky.map((r) => (
                <tr key={r.name} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1.5 truncate" title={r.name}>{r.name}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: PASS }}>{r.passed}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: FAIL }}>{r.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: scaleY(0.2); transform-origin: bottom; } to { opacity: 1; transform: scaleY(1); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
