"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDashboard, loadDurableDashboard, type DashboardData } from "./dashboardData";
import { clearHistory } from "../run/storage";
import OutcomesPanel from "./OutcomesPanel";
import {
  Gauge, TrendChart, useCountUp, useReducedMotion,
  PASS, FAIL, ERR, PASS_TEXT, FAIL_TEXT, ERR_TEXT,
} from "./dashboardCharts";


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

/** A small accent-tinted icon badge + uppercase title, shared by every panel so the
 *  dashboard reads as one designed system rather than a stack of plain boxes. */
function SectionHeader({ title, accent, icon, right }: { title: string; accent: string; icon: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, border: `1px solid ${accent}33`, color: accent }}>
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text2)" }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

const IconFail = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
const IconFlaky = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;

/** This-device ↔ all-runs source switch. */
function SourceToggle({ source, setSource, accent }: { source: Source; setSource: (s: Source) => void; accent: string }) {
  const opt = (v: Source, label: string) => (
    <button key={v} onClick={() => setSource(v)} className="text-[11px] px-2.5 py-1 rounded-md transition-colors font-semibold"
      style={source === v ? { background: accent, color: "#fff" } : { color: "var(--text2)" }}>{label}</button>
  );
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      {opt("local", "This device")}{opt("all", "All runs")}
    </div>
  );
}

/** Header shown in every state so the source toggle is always reachable. */
function HeaderBar({ source, setSource, accent, reduced, total, onRefresh, onClear }: {
  source: Source; setSource: (s: Source) => void; accent: string; reduced: boolean;
  total: number; onRefresh: () => void; onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-[12px] inline-flex items-center gap-2" style={{ color: "var(--text3)" }}>
        <span className="relative inline-flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full" style={{ background: PASS, animation: reduced ? undefined : "ping 2s cubic-bezier(0,0,.2,1) infinite" }} />
          <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: PASS }} />
        </span>
        {source === "local"
          ? <>Live · this browser&apos;s last {total} run{total === 1 ? "" : "s"}</>
          : <>Durable · all runs across devices ({total})</>}
      </p>
      <div className="flex items-center gap-2">
        <SourceToggle source={source} setSource={setSource} accent={accent} />
        <button onClick={onRefresh} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Refresh</button>
        {source === "local" && (
          <button onClick={onClear} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>Clear history</button>
        )}
      </div>
    </div>
  );
}

type Source = "local" | "all";

export default function RunDashboard({ accent }: { accent: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [source, setSource] = useState<Source>("local");
  const [needsSetup, setNeedsSetup] = useState(false);
  const reduced = useReducedMotion();

  const refresh = useCallback(async () => {
    if (source === "local") {
      setNeedsSetup(false);
      setData(loadDashboard());
      return;
    }
    const res = await loadDurableDashboard();
    if (res && "needs_setup" in res) { setNeedsSetup(true); setData(null); }
    else { setNeedsSetup(false); setData(res); }
  }, [source]);

  // Reload on mount and whenever the source toggles.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);

  // Live: refresh when another tab writes local history, on focus, and on an interval.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === "qa_run_history") void refresh(); };
    const onVis = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => void refresh(), 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(id);
    };
  }, [refresh]);

  const header = (
    <HeaderBar source={source} setSource={setSource} accent={accent} reduced={reduced}
      total={data?.total ?? 0} onRefresh={() => void refresh()}
      onClear={() => { clearHistory(); void refresh(); }} />
  );

  if (source === "all" && needsSetup) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="rounded-2xl px-5 py-12 text-center" style={CARD}>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Durable history not set up yet</p>
          <p className="text-[12px] mt-1 max-w-md mx-auto" style={{ color: "var(--text3)" }}>
            Run the one-time migration <code>supabase/qa_runs.sql</code> in the Supabase SQL editor to enable the cross-device dashboard. Until then, use <span className="font-semibold">This device</span>.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="flex flex-col gap-5">{header}</div>;

  if (data.total === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="rounded-2xl px-5 py-12 text-center" style={CARD}>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No runs yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text3)" }}>
            Run a test in the Run stage and your history rolls up here — live.
            {source === "local" ? " (Reads runs saved in this browser.)" : " (Across all devices.)"}
          </p>
        </div>
      </div>
    );
  }

  const maxFails = Math.max(1, ...data.topFailing.map((r) => r.fails));
  const label = "text-[11px] font-semibold uppercase tracking-wider";
  // Headline = TEST-CASE pass rate (how many individual tests pass). The per-run rate
  // reads far lower because one red test fails the whole run — keep that for the trend.
  const runPct = data.passRate == null ? null : Math.round(data.passRate * 100);
  const runTone = runPct == null ? "var(--text3)" : runPct >= 80 ? PASS_TEXT : runPct >= 50 ? ERR : FAIL_TEXT;

  return (
    <div className="flex flex-col gap-5">
      {header}

      {/* Hero: pass-rate gauge + KPI tiles, on an accent-tinted surface with depth */}
      <div className="rounded-2xl p-5 sm:p-6 flex items-center gap-6 lg:gap-8 flex-wrap"
        style={{ ...CARD, background: `radial-gradient(120% 140% at 0% 0%, ${accent}12, transparent 55%), var(--bg-card)` }}>
        <div className="shrink-0 mx-auto sm:mx-0 text-center">
          <Gauge rate={data.testPassRate} caption={`${data.passedTests}/${data.totalTests} tests passed`} />
          <p className="text-[10.5px] font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--text3)" }}>test-case pass rate</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-w-[260px]">
          <KpiTile label="Total runs" value={data.total} sub={`${data.passed} all-green · ${data.failed} with a failure`} />
          <KpiTile label="Tests passed" value={data.passedTests} sub={`of ${data.totalTests} test cases`} dot={PASS} />
          <KpiTile label="Tests failed" value={data.failedTests} sub={data.failed ? `across ${data.failed} run${data.failed === 1 ? "" : "s"}` : "none"} dot={FAIL} />
          <KpiTile label="Named tests" value={data.distinctTests} sub={data.errored ? `${data.errored} infra error${data.errored === 1 ? "" : "s"}` : "unique"} dot={accent} />
        </div>
      </div>

      {/* Pass-rate trend */}
      <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
        <div className="flex items-end justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className={label} style={{ color: "var(--text3)" }}>All-green run rate</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>Runs with zero failures · cumulative, oldest → newest</p>
          </div>
          {runPct != null && (
            <p className="text-[26px] font-extrabold tabular-nums leading-none" style={{ color: runTone, letterSpacing: "-0.02em" }}>
              {runPct}<span className="text-[15px] font-bold">%</span>
              <span className="text-[11px] font-semibold ml-1.5" style={{ color: "var(--text3)" }}>now</span>
            </p>
          )}
        </div>
        <TrendChart sequence={data.sequence} accent={accent} />
      </div>

      {/* Interactive outcome strip — Runs ↔ Tests toggle + click-to-drill breakdown */}
      <OutcomesPanel sequence={data.sequence} testSequence={data.testSequence} accent={accent} reduced={reduced} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top failing tests */}
        <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
          <SectionHeader title="Top failing tests" accent={accent} icon={IconFail}
            right={data.topFailing.length > 0 ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${FAIL}1f`, color: FAIL_TEXT }}>{data.topFailing.length} test{data.topFailing.length === 1 ? "" : "s"}</span> : undefined} />
          {data.topFailing.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>No failures recorded — every run passed.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.topFailing.map((r, i) => (
                <div key={r.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>{i + 1}</span>
                    <span className="text-[12px] truncate flex-1" style={{ color: "var(--text2)" }} title={r.name}>{r.name}</span>
                    <span className="text-[11px] tabular-nums shrink-0 font-bold px-1.5 py-0.5 rounded" style={{ background: `${FAIL}14`, color: FAIL_TEXT }}>
                      {r.fails}<span style={{ color: "var(--text3)", fontWeight: 500 }}>/{r.total} fail</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden ml-[30px]" style={{ background: "var(--surface)" }}>
                    <FailBar pct={(r.fails / maxFails) * 100} delay={i * 60} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flakiness */}
        <div className="rounded-2xl p-4 sm:p-5" style={CARD}>
          <SectionHeader title="Flaky tests" accent={ERR} icon={IconFlaky}
            right={data.flaky.length > 0 ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ERR}1f`, color: ERR_TEXT }}>{data.flaky.length} flaky</span> : undefined} />
          {data.flaky.length === 0 ? (
            <div className="flex items-center gap-2.5 text-[12px] rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", color: "var(--text3)" }}>
              <span style={{ color: PASS_TEXT }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              No flakiness detected — no test both passed and failed across runs.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {data.flaky.map((r) => {
                const tot = r.passed + r.failed;
                const stable = Math.round((r.passed / tot) * 100);
                return (
                  <div key={r.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] truncate" style={{ color: "var(--text2)" }} title={r.name}>{r.name}</span>
                      <span className="text-[11px] tabular-nums shrink-0 font-semibold">
                        <span style={{ color: PASS_TEXT }}>{r.passed}P</span> <span style={{ color: "var(--text3)" }}>·</span> <span style={{ color: FAIL_TEXT }}>{r.failed}F</span>
                        <span className="ml-1.5" style={{ color: "var(--text3)", fontWeight: 500 }}>{stable}% pass</span>
                      </span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]" style={{ background: "var(--surface)" }}>
                      <div className="rounded-l-full" style={{ width: `${(r.passed / tot) * 100}%`, background: PASS }} />
                      <div className="rounded-r-full" style={{ width: `${(r.failed / tot) * 100}%`, background: FAIL }} />
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
