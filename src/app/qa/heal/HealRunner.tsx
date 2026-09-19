"use client";

import { useEffect, useState } from "react";
import { useHealSuite, type HealGroup } from "./useHealSuite";
import { getSavedTests, type SavedTest } from "../run/storage";

export default function HealRunner({ accent }: { accent: string }) {
  const { state, runSuite, healGroup, reset } = useHealSuite();
  const [saved, setSaved] = useState<SavedTest[]>([]);

  useEffect(() => { setSaved(getSavedTests()); }, []);

  const busy = state.phase === "running" || state.phase === "grouping";
  const failedCount = state.items.filter((i) => i.passed === false).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Fix a break across the whole suite.</span>{" "}
        Run your saved tests, group the failures by root cause — <em>&quot;1 issue · N tests&quot;</em> — and
        heal each group in one click. Each test runs on the isolated CI runner (about a minute each).
      </div>

      {saved.length === 0 ? (
        <div className="rounded-2xl p-6 text-[13px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          No saved tests yet. Save a few from the <b>Run</b> stage (or draft them in <b>Author</b> / <b>Discover</b>),
          then come back here to run and heal them as a suite.
        </div>
      ) : (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "var(--text2)" }}>{saved.length} saved test{saved.length === 1 ? "" : "s"} in this browser</span>
            <div className="flex items-center gap-2">
              <button onClick={() => runSuite(saved.map((t) => ({ name: t.name, code: t.code })))} disabled={busy}
                className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
                style={{ background: accent, color: "#fff" }}>
                {busy ? "Running suite…" : `Run suite (${saved.length})`}
              </button>
              {(state.phase === "grouped" || state.phase === "empty" || state.phase === "error") && (
                <button onClick={reset} className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>Clear</button>
              )}
            </div>
          </div>

          {state.phase === "running" && (
            <div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(state.done / state.total) * 100}%`, background: accent }} />
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text3)" }}>Running {state.done} / {state.total}…</p>
            </div>
          )}
          {state.phase === "grouping" && <p className="text-[12px]" style={{ color: "var(--text3)" }}>Grouping failures by root cause…</p>}
        </div>
      )}

      {state.items.length > 0 && state.phase !== "running" && (
        <div className="flex flex-wrap gap-2">
          {state.items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: it.passed ? "#34d399" : "#f43f5e" }} />
              {it.name}
            </span>
          ))}
        </div>
      )}

      {state.phase === "empty" && (
        <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "#34d39914", border: "1px solid #34d39940", color: "var(--text2)" }}>
          All {state.total} tests passed — nothing to heal.
        </div>
      )}

      {state.phase === "error" && (
        <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {state.error}
        </div>
      )}

      {state.phase === "grouped" && (
        <>
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            {failedCount} failure{failedCount === 1 ? "" : "s"} in {state.groups.length} group{state.groups.length === 1 ? "" : "s"}.
          </p>
          {state.groups.map((g, gi) => (
            <GroupCard key={gi} group={g} accent={accent} onHeal={() => healGroup(gi, g.members)} />
          ))}
        </>
      )}
    </div>
  );
}

function GroupCard({ group, accent, onHeal }: { group: HealGroup; accent: string; onHeal: () => void }) {
  const n = group.members.length;
  const anyHealing = group.members.some((m) => m.healing);
  const allDone = group.members.every((m) => m.passedAfter !== null || m.note);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="min-w-0">
          <p className="text-[12px] font-bold" style={{ color: "var(--text)" }}>1 issue · {n} test{n === 1 ? "" : "s"}</p>
          <p className="text-[11px] font-mono truncate mt-0.5" style={{ color: "var(--text3)" }}>{group.cause}</p>
        </div>
        <button onClick={onHeal} disabled={anyHealing || allDone}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
          style={{ background: accent, color: "#fff" }}>
          {anyHealing ? "Healing…" : allDone ? "Healed" : `Heal all (${n})`}
        </button>
      </div>
      <ul>
        {group.members.map((m, mi) => (
          <li key={mi} className="flex items-center gap-2.5 px-4 py-2 border-b last:border-0 text-[12px]" style={{ borderColor: "var(--border)" }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{
              background: m.passedAfter === true ? "#34d399" : m.passedAfter === false || m.note ? "#f43f5e" : m.healing ? accent : "#f59e0b",
            }} />
            <span className="flex-1 truncate" style={{ color: "var(--text2)" }}>{m.name}</span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>
              {m.healing ? "healing…" : m.passedAfter === true ? "healed · passed" : m.passedAfter === false ? "still failing" : m.note ? m.note : "failed"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
