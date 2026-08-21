"use client";

import { useRobustTrainingDefense, type ModelResult } from "./useRobustTrainingDefense";

function ModelPanel({ title, accent, result }: { title: string; accent: string; result: ModelResult }) {
  return (
    <div className="flex flex-col gap-3 flex-1 min-w-[240px]">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>{title}</span>
        <span className="text-[9px] px-1.5 py-px rounded shrink-0"
          style={{
            background: result.fooled ? "#f8717118" : "#34d39918",
            color: result.fooled ? "#f87171" : "#34d399",
          }}>
          {result.fooled ? "Fooled" : "Resisted"}
        </span>
      </div>
      <img src={`data:image/png;base64,${result.adversarial_image}`} alt="Adversarial digit"
        className="rounded-lg" style={{ width: 96, height: 96, imageRendering: "pixelated", background: "#000" }} />
      <div className="flex flex-col gap-1 text-[11px]" style={{ color: "var(--text3)" }}>
        <span>Clean: predicted <strong style={{ color: "var(--text)" }}>{result.clean_pred}</strong> ({(result.clean_conf * 100).toFixed(1)}%)</span>
        <span>After attack: predicted <strong style={{ color: result.fooled ? "#f87171" : "#34d399" }}>{result.adv_pred}</strong> ({(result.adv_conf * 100).toFixed(1)}%)</span>
      </div>
    </div>
  );
}

/** Section within the Adversarial Robustness Lab demonstrating adversarial
 * training as a defense — a different SHAPE of defense than JPEG
 * recompression / randomized smoothing, since it changes how the model
 * was trained rather than post-processing the input. See
 * useRobustTrainingDefense's docstring and mm_robust_training.py's module
 * docstring for the real numbers behind this framing. */
export default function RobustTrainingDefense({ accent }: { accent: string }) {
  const { samples, samplesError, selectedId, setSelectedId, epsilon, setEpsilon, run, running, result, error } =
    useRobustTrainingDefense();

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  return (
    <div style={cardStyle} className="p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
          Defense #3: Adversarial training (a digit-classifier demo)
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>
          Unlike the two defenses above, this one changes HOW a model is trained, not what happens to
          an image at inference time. Two small digit classifiers were trained once, offline, on the
          same data — one normally, one adversarially (Madry-style: trained directly on PGD-attacked
          examples). Pick a digit, attack BOTH models with the same white-box PGD attack, and see the
          real difference.
        </p>
      </div>

      {samplesError && <p className="text-xs" style={{ color: "#f87171" }}>{samplesError}</p>}

      {samples.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Pick a sample digit</span>
          <div className="flex gap-2 flex-wrap">
            {samples.map(s => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className="rounded-lg p-1 transition-colors"
                style={{
                  border: `2px solid ${selectedId === s.id ? accent : "rgba(255,255,255,0.1)"}`,
                  background: "#000",
                }}>
                <img src={`data:image/png;base64,${s.image_b64}`} alt={`Digit ${s.label}`}
                  style={{ width: 36, height: 36, imageRendering: "pixelated" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
          Attack strength (epsilon): {epsilon.toFixed(2)}
          <input type="range" min={0.02} max={0.4} step={0.02} value={epsilon}
            onChange={e => setEpsilon(Number(e.target.value))} className="w-32" />
        </label>
        <button onClick={run} disabled={running || samples.length === 0}
          className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border"
          style={{ borderColor: `${accent}50`, color: accent, opacity: running ? 0.5 : 1 }}>
          {running ? "Attacking both models…" : "Attack both models"}
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

      {result && (
        <div className="flex flex-col gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[11px]" style={{ color: "var(--text3)" }}>True label: <strong style={{ color: "var(--text)" }}>{result.label}</strong></p>
          <div className="flex gap-6 flex-wrap">
            <ModelPanel title="Standard-trained model" accent={accent} result={result.standard} />
            <ModelPanel title="Adversarially-trained model" accent={accent} result={result.adversarial_trained} />
          </div>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            Real measured numbers across the full MNIST test set (not just this one digit): the standard
            model drops from 98.6% clean accuracy to 1.1% robust accuracy under this attack; the
            adversarially-trained model drops from only 97.0% to 84.3% under the same attack. Adversarial
            training isn&apos;t free — it costs some clean accuracy — but it&apos;s a real, measured
            robustness gain, not a marginal one.
          </p>
        </div>
      )}
    </div>
  );
}
