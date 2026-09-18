"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAnomalyDetection, type ScoredEvent } from "./useAnomalyDetection";
import { ATTACK_LABELS } from "./trafficSimulator";

/** Backend feature name -> human label, for the "most unusual feature" chip. */
const FEATURE_LABEL: Record<string, string> = {
  req_per_min: "Requests/min",
  payload_bytes: "Payload size",
  hour: "Time of day",
  path_randomness: "Path randomness",
  error_rate: "Error rate",
};

function StatCard({ label, value, accent, hot }: { label: string; value: string; accent: string; hot?: boolean }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{
      background: "var(--surface)",
      border: `1px solid ${hot ? "#ef444455" : "var(--border)"}`,
    }}>
      <span className="text-2xl font-bold tabular-nums" style={{ color: hot ? "#ef4444" : accent }}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</span>
    </div>
  );
}

function statusColor(status: number): string {
  if (status >= 500) return "#ef4444";
  if (status >= 400) return "#f59e0b";
  return "#22c55e";
}

function FeedRow({ e, accent }: { e: ScoredEvent; accent: string }) {
  const hot = e.isAnomaly;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, backgroundColor: hot ? "rgba(239,68,68,0.35)" : "rgba(0,0,0,0)" }}
      animate={{ opacity: 1, y: 0, backgroundColor: hot ? "rgba(239,68,68,0.08)" : "rgba(0,0,0,0)" }}
      transition={{ duration: 0.5 }}
      className="rounded-lg px-3 py-2 flex items-center gap-3 text-xs"
      style={{ border: `1px solid ${hot ? "#ef444455" : "var(--border)"}` }}
    >
      <span className="font-mono font-bold w-11 shrink-0" style={{ color: "var(--text3)" }}>{e.method}</span>
      <span className="font-mono truncate flex-1 min-w-0" style={{ color: "var(--text)" }}>{e.path}</span>
      <span className="font-mono hidden sm:inline shrink-0" style={{ color: "var(--text3)" }}>{e.ip}</span>
      <span className="font-mono font-bold w-8 text-right shrink-0" style={{ color: statusColor(e.status) }}>{e.status}</span>
      {hot ? (
        <span className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444440" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {FEATURE_LABEL[e.topFeature] ?? e.topFeature}
        </span>
      ) : (
        <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: `${accent}66` }} aria-label="clear" />
      )}
    </motion.div>
  );
}

function Scorecard({ card, missed, falseAlarms, accent }: { card: NonNullable<ReturnType<typeof useAnomalyDetection>["scorecard"]>; missed: ScoredEvent[]; falseAlarms: ScoredEvent[]; accent: string }) {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" data-wt="ad-scorecard"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>How the model did — scored against the ground truth it never saw</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><div className="text-xl font-bold tabular-nums" style={{ color: "#22c55e" }}>{card.caught}/{card.attacks}</div><div className="text-[11px]" style={{ color: "var(--text3)" }}>Attacks caught</div></div>
        <div><div className="text-xl font-bold tabular-nums" style={{ color: card.missed ? "#f59e0b" : "var(--text2)" }}>{card.missed}</div><div className="text-[11px]" style={{ color: "var(--text3)" }}>Missed</div></div>
        <div><div className="text-xl font-bold tabular-nums" style={{ color: card.falseAlarms ? "#f59e0b" : "var(--text2)" }}>{card.falseAlarms}</div><div className="text-[11px]" style={{ color: "var(--text3)" }}>False alarms</div></div>
        <div><div className="text-xl font-bold tabular-nums" style={{ color: accent }}>{pct(card.precision)} / {pct(card.recall)}</div><div className="text-[11px]" style={{ color: "var(--text3)" }}>Precision / recall</div></div>
      </div>
      {(missed.length > 0 || falseAlarms.length > 0) && (
        <ul className="text-[11px] leading-relaxed flex flex-col gap-1" style={{ color: "var(--text3)" }}>
          {missed.map((e) => (
            <li key={`m-${e.id}`}><span style={{ color: "#f59e0b" }}>Missed:</span> a {ATTACK_LABELS[e.label].toLowerCase()} the model let through.</li>
          ))}
          {falseAlarms.map((e) => (
            <li key={`f-${e.id}`}><span style={{ color: "#f59e0b" }}>False alarm:</span> a normal <span className="font-mono">{e.path}</span> request flagged as an attack.</li>
          ))}
        </ul>
      )}
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text3)" }}>
        The Isolation Forest was trained on the normal baseline only and never saw which requests were attacks, so these numbers are honest — including any it got wrong.
      </p>
    </div>
  );
}

export default function AnomalyRunner({ accent }: { accent: string }) {
  const { phase, error, run, reset, baselineSize, visible, total, processed, flaggedSoFar, scorecard } = useAnomalyDetection();
  const rows = [...visible].reverse(); // newest on top
  const missed = scorecard ? visible.filter((e) => e.label !== "normal" && !e.isAnomaly) : [];
  const falseAlarms = scorecard ? visible.filter((e) => e.label === "normal" && e.isAnomaly) : [];

  const statusText = phase === "idle" ? "Idle"
    : phase === "scoring" ? "Learning normal traffic and scoring…"
    : phase === "streaming" ? `Monitoring live feed — ${processed}/${total}`
    : "Run complete";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3" data-wt="ad-run">
        <button onClick={run} disabled={phase === "scoring" || phase === "streaming"}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{ background: accent, color: "#fff" }}>
          {phase === "idle" ? "Run detection" : phase === "done" ? "Replay with new traffic" : "Running…"}
        </button>
        {phase !== "idle" && (
          <button onClick={reset} disabled={phase === "scoring" || phase === "streaming"}
            className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>Reset</button>
        )}
        <span className="text-xs flex items-center gap-2" style={{ color: "var(--text3)" }}>
          {(phase === "scoring" || phase === "streaming") && (
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
          )}
          {statusText}
        </span>
      </div>

      <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: `${accent}0e`, border: `1px solid ${accent}25`, color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>Simulated traffic.</strong> A live site can&apos;t stream its own request logs into a public page, so this generates a labelled stream — normal traffic plus a few planted attacks — and a real scikit-learn Isolation Forest on the backend scores it without seeing the labels.
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>{error}</div>
      )}

      <div className="grid grid-cols-3 gap-3" data-wt="ad-stats">
        <StatCard label="Baseline learned" value={baselineSize ? baselineSize.toLocaleString() : "—"} accent={accent} />
        <StatCard label="Requests processed" value={processed ? String(processed) : "—"} accent={accent} />
        <StatCard label="Anomalies flagged" value={phase === "idle" ? "—" : String(flaggedSoFar)} accent={accent} hot={flaggedSoFar > 0} />
      </div>

      {scorecard && <Scorecard card={scorecard} missed={missed} falseAlarms={falseAlarms} accent={accent} />}

      <div className="rounded-xl p-4" data-wt="ad-feed" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Live request feed</h2>
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>newest first</span>
        </div>
        {phase === "idle" ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--text3)" }}>Press <strong>Run detection</strong> to start the feed.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {rows.map((e) => <FeedRow key={e.id} e={e} accent={accent} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="text-xs leading-relaxed rounded-xl p-4" data-wt="ad-limits" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this is and isn&apos;t:</strong> the traffic is simulated, but the detector is a genuine unsupervised Isolation Forest (scikit-learn) learning &ldquo;normal&rdquo; from a baseline and flagging outliers in five real request features — requests/min, payload size, time of day, path randomness and error rate. The red chip on a flagged row names the single feature that deviates most from the baseline; it is a plain-English hint, not the model&apos;s internal reason. A real deployment would feed live logs and retrain on its own traffic. Attack kinds planted here: {Object.entries(ATTACK_LABELS).filter(([k]) => k !== "normal").map(([, v]) => v).join(", ")}.
      </div>
    </div>
  );
}
