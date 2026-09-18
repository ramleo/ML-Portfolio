"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useIntrusionDetection, type ClassifiedRow } from "./useIntrusionDetection";
import IntrusionScorecard, { CLASS_COLOR } from "./IntrusionScorecard";

const CLASS_NAMES = ["normal", "DoS", "Probe", "R2L", "U2R"];

function Chip({ cls }: { cls: number }) {
  const name = CLASS_NAMES[cls] ?? String(cls);
  const c = CLASS_COLOR[name] ?? "#6b8bbf";
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${c}20`, color: c, minWidth: 52, textAlign: "center" }}>{name}</span>
  );
}

function FeedRow({ r }: { r: ClassifiedRow }) {
  const border = r.correct ? "var(--border)" : "#ef444455";
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="rounded-lg px-3 py-2 flex items-center gap-3 text-xs"
      style={{ background: r.correct ? "var(--surface)" : "#ef44440e", border: `1px solid ${border}` }}>
      <span className="font-mono shrink-0" style={{ color: "var(--text3)", width: 40 }}>#{r.index}</span>
      <Chip cls={r.trueClass} />
      <span style={{ color: "var(--text3)" }}>→</span>
      <Chip cls={r.pred} />
      {!r.correct && <span className="text-[10px] font-bold" style={{ color: "#ef4444" }}>missed</span>}
      <span className="ml-auto tabular-nums text-[10px]" style={{ color: "var(--text3)" }}>conf {(r.confidence * 100).toFixed(0)}%</span>
    </motion.div>
  );
}

export default function IntrusionRunner({ accent }: { accent: string }) {
  const { phase, error, run, reset, nTrain, visible, revealed, total, correctSoFar, scorecard } = useIntrusionDetection();

  const running = phase === "classifying" || phase === "streaming";
  const progress = total ? revealed / total : 0;
  const runningAcc = revealed ? correctSoFar / revealed : 0;
  const feed = [...visible].slice(-24).reverse();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
          A real scikit-learn <strong style={{ color: "var(--text)" }}>RandomForest</strong> is trained in the backend on a labelled sample of NSL-KDD network connections, then classifies a <strong style={{ color: "var(--text)" }}>held-out test set</strong> it has never seen into five classes: normal, DoS, Probe, R2L and U2R. The model never sees the test labels, so everything below is scored honestly against ground truth.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={running}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: accent, color: "#fff" }}>
            {phase === "classifying" ? "Training & classifying…" : phase === "streaming" ? "Classifying…" : "Classify test traffic"}
          </button>
          {(phase === "done" || phase === "streaming") && (
            <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Reset</button>
          )}
          {nTrain > 0 && (
            <span className="text-[11px] ml-auto" style={{ color: "var(--text3)" }}>
              trained on <strong style={{ color: "var(--text2)" }}>{nTrain.toLocaleString()}</strong> connections
            </span>
          )}
        </div>
        {error && (
          <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>{error}</div>
        )}
      </div>

      {running && total > 0 && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--text2)" }}>Classifying held-out connections…</span>
            <span className="tabular-nums" style={{ color: "var(--text3)" }}>{revealed}/{total} · running accuracy {(runningAcc * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${progress * 100}%`, background: accent }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {feed.map((r) => <FeedRow key={r.index} r={r} />)}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase === "done" && scorecard && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: `1px solid ${accent}55` }}>
              <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>{(scorecard.accuracy * 100).toFixed(1)}%</span>
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>Accuracy</span>
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "#22c55e" }}>{scorecard.correct}</span>
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>Correct</span>
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "#ef4444" }}>{scorecard.total - scorecard.correct}</span>
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>Misclassified</span>
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>{scorecard.total}</span>
              <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>Test connections</span>
            </div>
          </div>
          <IntrusionScorecard sc={scorecard} accent={accent} />
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this is:</strong> a genuine supervised classifier (scikit-learn RandomForest) over the <strong style={{ color: "var(--text2)" }}>NSL-KDD</strong> intrusion-detection benchmark (Canadian Institute for Cybersecurity, UNB). It is trained live on a bundled labelled sample and scored on a held-out test split. NSL-KDD is a <strong style={{ color: "var(--text2)" }}>dated benchmark</strong> (late-1990s attack families), so these numbers do not transfer directly to modern live traffic — and R2L and U2R are famously rare and hard, which the per-class recall shows honestly rather than averaging it away.
      </div>
    </div>
  );
}
