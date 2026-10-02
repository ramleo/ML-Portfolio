"use client";

import { useEffect, useState } from "react";
import { loadDashboard, type DashboardData, type Status } from "./dashboardData";
import { clearHistory } from "../run/storage";

// Reserved status palette (same as the result view). Always shown WITH a text label —
// never color-alone — per the dataviz contrast relief requirement.
const PASS = "#34d399", FAIL = "#f43f5e", ERR = "#f59e0b";
const statusColor = (s: Status) => (s === "passed" ? PASS : s === "failed" ? FAIL : ERR);
const statusLabel = (s: Status) => (s === "passed" ? "passed" : s === "failed" ? "failed" : "error");
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text3)" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{sub}</p>}
    </div>
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
  const refresh = () => setData(loadDashboard());
  // Client-only (localStorage) — load after mount to avoid an SSR hydration mismatch.
  useEffect(() => { refresh(); }, []);

  if (!data) return null;

  if (data.total === 0) {
    return (
      <div className="rounded-2xl px-5 py-10 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No runs yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--text3)" }}>
          Run a test in the Run stage and your history will roll up here. (This dashboard reads runs saved in this browser.)
        </p>
      </div>
    );
  }

  const maxFails = Math.max(1, ...data.topFailing.map((r) => r.fails));
  const sectionCard = { background: "var(--bg-card)", border: "1px solid var(--border)" };
  const label = "text-[11px] font-semibold uppercase tracking-wide mb-3";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px]" style={{ color: "var(--text3)" }}>
          From this browser&apos;s last {data.total} run{data.total === 1 ? "" : "s"}.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="text-[11px] px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Refresh</button>
          <button onClick={() => { clearHistory(); refresh(); }} className="text-[11px] px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Clear history</button>
        </div>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total runs" value={String(data.total)} />
        <Tile label="Pass rate" value={data.passRate == null ? "—" : `${Math.round(data.passRate * 100)}%`}
          sub={data.passRate == null ? "no decided runs" : `${data.passed} passed · ${data.failed} failed`} />
        <Tile label="Failures" value={String(data.failed)} sub={data.errored ? `${data.errored} infra error${data.errored === 1 ? "" : "s"}` : undefined} />
        <Tile label="Distinct tests" value={String(data.distinctTests)} />
      </div>

      {/* Outcome over time (oldest -> newest) */}
      <div className="rounded-2xl p-4" style={sectionCard}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <p className={label + " mb-0"} style={{ color: "var(--text3)" }}>Outcomes over time (oldest → newest)</p>
          <div className="flex items-center gap-3">
            <LegendDot color={PASS} label="passed" />
            <LegendDot color={FAIL} label="failed" />
            <LegendDot color={ERR} label="error" />
          </div>
        </div>
        <div className="flex items-end gap-[2px]" style={{ height: 40 }}>
          {data.sequence.map((p, i) => (
            <div key={i} title={`${p.name} — ${statusLabel(p.status)} — ${fmtDate(p.at)}`}
              className="flex-1 rounded-sm" style={{ background: statusColor(p.status), minWidth: 5, height: "100%" }} />
          ))}
        </div>
      </div>

      {/* Top failing tests (magnitude, single hue + direct value labels) */}
      <div className="rounded-2xl p-4" style={sectionCard}>
        <p className={label} style={{ color: "var(--text3)" }}>Top failing tests</p>
        {data.topFailing.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>No failures recorded — every run passed.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.topFailing.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="text-[12px] truncate shrink-0" style={{ color: "var(--text2)", width: 160 }} title={r.name}>{r.name}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(r.fails / maxFails) * 100}%`, background: accent, minWidth: 4 }} />
                </div>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color: "var(--text3)", width: 56 }}>
                  {r.fails}/{r.total} fail
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flakiness — a table, not color-alone */}
      <div className="rounded-2xl p-4" style={sectionCard}>
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
    </div>
  );
}
