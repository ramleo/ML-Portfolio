"use client";

import { qaUrl } from "../lib/qaClient";
import type { RunState } from "./useRun";

export type HealInfo = { provider?: string | null; removed: string[]; added: string[]; error?: string };

/** Lines present in one version but not the other — a cheap locator diff. */
export function lineDiff(oldCode: string, newCode: string): { removed: string[]; added: string[] } {
  const a = oldCode.split("\n"), b = newCode.split("\n");
  const setA = new Set(a), setB = new Set(b);
  const removed = a.filter((l) => l.trim() && !setB.has(l)).slice(0, 6);
  const added = b.filter((l) => l.trim() && !setA.has(l)).slice(0, 6);
  return { removed, added };
}

const STEPS = ["Queued", "Running", "Results"] as const;

export function stepIndex(phase: string): number {
  if (phase === "queued") return 0;
  if (phase === "in_progress") return 1;
  if (phase === "completed" || phase === "error") return 2;
  return -1;
}

function fmtMs(ms?: number | null): string {
  if (ms == null) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function Stepper({ active, phase, accent }: { active: number; phase: string; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < active || phase === "completed";
        const current = i === active && phase !== "completed" && phase !== "error";
        const on = done || current;
        return (
          <div key={label} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: on ? `${accent}18` : "var(--surface)",
                color: on ? accent : "var(--text3)",
                border: `1px solid ${on ? `${accent}45` : "var(--border)"}`,
              }}>
              {current
                ? <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: accent }} />
                : <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? accent : "var(--text3)" }} />}
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="w-5 h-px" style={{ background: "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}

export function HealBanner({ info, accent }: { info: HealInfo; accent: string }) {
  if (info.error) {
    return (
      <div className="rounded-xl px-4 py-3 text-[12px]"
        style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Couldn&apos;t heal.</span> {info.error}
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: `${accent}0d`, border: `1px solid ${accent}30` }}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: `${accent}22` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8">
          <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
        </svg>
        <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
          Self-healed the locator{info.provider ? ` · ${info.provider}` : ""}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text3)" }}>— re-running the corrected test</span>
      </div>
      {(info.removed.length > 0 || info.added.length > 0) && (
        <pre className="text-[11px] font-mono overflow-x-auto px-4 py-2.5 m-0 leading-relaxed">
          {info.removed.map((l, i) => (
            <div key={`r${i}`} style={{ color: "#f43f5e" }}>- {l.trim()}</div>
          ))}
          {info.added.map((l, i) => (
            <div key={`a${i}`} style={{ color: "#34d399" }}>+ {l.trim()}</div>
          ))}
        </pre>
      )}
    </div>
  );
}

export function Result({ state, accent, onHeal, healing, healed, onSave }: {
  state: RunState;
  accent: string;
  onHeal: () => void;
  healing: boolean;
  healed: boolean;
  onSave: () => void;
}) {
  const passed = state.passed === true;
  const color = passed ? "#34d399" : "#f43f5e";
  const s = state.summary;
  const cid = state.correlationId;
  const sectionBorder = { borderColor: "var(--border)" };
  const label = "text-[11px] font-semibold uppercase tracking-wide mb-2";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={sectionBorder}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{passed ? "Passed" : "Failed"}</span>
          {s && (
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>
              {s.expected} passed · {s.unexpected} failed{s.flaky ? ` · ${s.flaky} flaky` : ""}{s.skipped ? ` · ${s.skipped} skipped` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!passed && !healed && (
            <button onClick={onHeal} disabled={healing}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
              style={{ background: accent, color: "#fff" }}>
              {healing ? "Healing…" : "Heal & re-run"}
            </button>
          )}
          <button onClick={onSave}
            className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
            Save test
          </button>
          {state.runUrl && (
            <a href={state.runUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: `${accent}45`, color: accent }}>
              Open on GitHub
            </a>
          )}
        </div>
      </div>

      {cid && state.hasVideo && (
        <div className="p-4 border-b" style={sectionBorder}>
          <p className={label} style={{ color: "var(--text3)" }}>Run video</p>
          <video controls preload="metadata" className="w-full rounded-lg"
            style={{ border: "1px solid var(--border)", maxHeight: 440, background: "#000" }}
            src={qaUrl(`/qa/run/artifact/${cid}/video`)} />
        </div>
      )}

      {state.screenshot && (
        <div className="p-4 border-b" style={sectionBorder}>
          <p className={label} style={{ color: "var(--text3)" }}>Failure screenshot</p>
          <img alt="Failure screenshot" src={`data:image/png;base64,${state.screenshot}`}
            className="w-full rounded-lg" style={{ border: "1px solid var(--border)" }} />
        </div>
      )}

      {state.steps.length > 0 && (
        <div className="p-4 border-b" style={sectionBorder}>
          <p className={label} style={{ color: "var(--text3)" }}>Steps ({state.steps.length})</p>
          <ol className="flex flex-col">
            {state.steps.map((st, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[12px] py-1.5 border-b last:border-0" style={sectionBorder}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.ok ? "#34d399" : "#f43f5e" }} />
                <span className="flex-1 truncate font-mono" style={{ color: "var(--text2)" }}>{st.title}</span>
                <span className="tabular-nums shrink-0" style={{ color: "var(--text3)" }}>{fmtMs(st.duration)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {cid && state.hasTrace && (
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <a href={qaUrl(`/qa/run/artifact/${cid}/trace`)}
            className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: `${accent}45`, color: accent }}>
            Download trace (.zip)
          </a>
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>
            Open it at{" "}
            <a href="https://trace.playwright.dev" target="_blank" rel="noopener noreferrer" className="underline">trace.playwright.dev</a>
          </span>
        </div>
      )}
    </div>
  );
}
