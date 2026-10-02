"use client";

import { useEffect, useState } from "react";
import { loadDashboard, type DashboardData, type Status } from "./dashboardData";
import { clearHistory } from "../run/storage";
import {
  Gauge, TrendChart, useCountUp, useReducedMotion,
  PASS, FAIL, ERR, PASS_TEXT, FAIL_TEXT,
} from "./dashboardCharts";

const statusColor = (s: Status) => (s === "passed" ? PASS : s === "failed" ? FAIL : ERR);
const statusLabel = (s: Status) => (s === "passed" ? "passed" : s === "failed" ? "failed" : "error");
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const CARD: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 30px -18px rgba(0,0,0,0.25)",
};

function KpiTile({ label, value, sub, dot }: { label: string; value: number; sub?: string; dot?: string }) {
  const n = useCountUp(value);
  return (
    <div className="rounded-xl px-4 py-3.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5" style={{ color: "var(--text3)" }}>
        {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}{label}
      </p>
      <p className="text-[28px] leading-none font-extrabold tabular-nums mt-2" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{Math.round(n)}</p>
      {sub && <p className="text-[11px] mt-1.5" style={{ color: "var(--text3)" }}>{sub}</p>}
    </div>
  );
}

function FailBar({ pct, delay }: { pct: number; delay: number }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(reduced ? pct : 0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div className="h-2.5 rounded-full" style={{
      width: `${Math.max(w, 2)}%`, minWidth: 6,
      background: `linear-gradient(90deg, ${FAIL}, ${ERR})`,
      transition: reduced ? undefined : `width 850ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
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
    // Load on mount only — localStorage can't be read during SSR, so this can't be a
    // lazy useState initializer without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="rounded-2xl px-5 py-12 text-center" style={CARD}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No runs yet</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--text3)" }}>
          Run a test in the Run stage and your history rolls up here — live. (Reads runs saved in this browser.)
        </p>
      </div>
    );
  }

  const maxFails = Math.max(1, ...data.topFailing.map((r) => r.fails));
  const label = "text-[11px] font-semibold uppercase tracking-wider";
  const ratePct = data.passRate == null ? null : Math.round(data.passRate * 100);
  const rateTone = ratePct == null ? "var(--text3)" : ratePct >= 80 ? PASS_TEXT : ratePct >= 50 ? ERR : FAIL_TEXT;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] inline-flex items-center gap-2" style={{ color: "var(--text3)" }}>
          <span className="relative inline-flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full" style={{ background: PASS, animation: reduced ? undefined : "ping 2s cubic-bezier(0,0,.2,1) infinite" }} />
            <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: PASS }} />
          </span>
          Live · this browser&apos;s last {data.total} run{data.total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Refresh</button>
          <button onClick={() => { clearHistory(); refresh(); }} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Clear history</button>
        </div>
      </div>

      {/* Hero: pass-rate gauge + KPI tiles, on an accent-tinted surface with depth */}
      <div className="rounded-2xl p-5 sm:p-6 flex items-center gap-6 lg:gap-8 flex-wrap"
        style={{ ...CARD, background: `radial-gradient(120% 140% at 0% 0%, ${accent}12, transparent 55%), var(--bg-card)` }}>
        <div className="shrink-0 mx-auto sm:mx-0">
          <Gauge rate={data.passRate} caption={`${data.passed}/${data.passed + data.failed} runs`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-[260px]">
          <KpiTile label="Total runs" value={data.total} sub={`${data.totalTests} test cases`} />
          <KpiTile label="Passed" value={data.passed} sub="runs" dot={PASS} />
          <KpiTile label="Failed" value={data.failed} sub={`${data.failedTests} failed tests`} dot={FAIL} />
          <KpiTile label="Named tests" value={data.distinctTests} sub={data.errored ? `${data.errored} infra error${data.errored === 1 ? "" : "s"}` : "unique"} dot={accent} />
        </div>
      </div>

      {/* Pass-rate trend */}
      <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
        <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className={label} style={{ color: "var(--text3)" }}>Pass-rate trend</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>Cumulative, oldest → newest</p>
          </div>
          {ratePct != null && (
            <p className="text-[26px] font-extrabold tabular-nums leading-none" style={{ color: rateTone, letterSpacing: "-0.02em" }}>
              {ratePct}<span className="text-[15px] font-bold">%</span>
              <span className="text-[11px] font-semibold ml-1.5" style={{ color: "var(--text3)" }}>now</span>
            </p>
          )}
        </div>
        <TrendChart sequence={data.sequence} accent={accent} />
      </div>

      {/* Per-run outcome strip */}
      <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <p className={label} style={{ color: "var(--text3)" }}>Outcomes over time</p>
          <div className="flex items-center gap-3">
            <LegendDot color={PASS} label="passed" /><LegendDot color={FAIL} label="failed" /><LegendDot color={ERR} label="error" />
          </div>
        </div>
        <div className="flex items-end gap-[3px]" style={{ height: 44 }}>
          {data.sequence.map((p, i) => (
            <div key={i} title={`${p.name} — ${statusLabel(p.status)} — ${fmtDate(p.at)}`}
              className="flex-1 rounded-md" style={{
                background: statusColor(p.status), minWidth: 5, height: "100%",
                opacity: reduced ? 1 : 0, animation: reduced ? undefined : `rise 440ms ease-out ${i * 40}ms forwards`,
              }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top failing tests */}
        <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
          <p className={label + " mb-3"} style={{ color: "var(--text3)" }}>Top failing tests</p>
          {data.topFailing.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No failures recorded — every run passed.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.topFailing.map((r, i) => (
                <div key={r.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] truncate" style={{ color: "var(--text2)" }} title={r.name}>{r.name}</span>
                    <span className="text-[11px] tabular-nums shrink-0 font-semibold" style={{ color: FAIL_TEXT }}>{r.fails}<span style={{ color: "var(--text3)" }}>/{r.total}</span></span>
                  </div>
                  <FailBar pct={(r.fails / maxFails) * 100} delay={i * 60} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flakiness */}
        <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
          <p className={label + " mb-3"} style={{ color: "var(--text3)" }}>Flaky tests</p>
          {data.flaky.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>None detected — no test both passed and failed.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.flaky.map((r) => {
                const tot = r.passed + r.failed;
                return (
                  <div key={r.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] truncate" style={{ color: "var(--text2)" }} title={r.name}>{r.name}</span>
                      <span className="text-[11px] tabular-nums shrink-0">
                        <span style={{ color: PASS_TEXT }}>{r.passed}P</span> · <span style={{ color: FAIL_TEXT }}>{r.failed}F</span>
                      </span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                      <div style={{ width: `${(r.passed / tot) * 100}%`, background: PASS }} />
                      <div style={{ width: `${(r.failed / tot) * 100}%`, background: FAIL }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: scaleY(0.2); transform-origin: bottom; } to { opacity: 1; transform: scaleY(1); } }
        @keyframes ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </div>
  );
}
