"use client";

import { useRef } from "react";
import { useAdversarial, type Prediction } from "./useAdversarial";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

function PredictionCard({ title, src, prediction, badge, accent }: {
  title: string; src: string; prediction: Prediction; badge?: { text: string; color: string }; accent: string;
}) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>{title}</span>
      <img src={src} alt={title}
        className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
          {prediction.label} ({Math.round(prediction.confidence * 100)}%)
        </span>
        {badge && (
          <span className="text-[9px] px-1.5 py-px rounded shrink-0" style={{ background: `${badge.color}18`, color: badge.color }}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}

/** Upload a photo, fool a pretrained ImageNet classifier with an FGSM/PGD
 * adversarial perturbation, then see whether a JPEG-recompression defense
 * recovers the correct prediction — usually it doesn't fully, which is the
 * honest point of this demo, not a bug. See useAdversarial's docstring. */
export default function AdversarialRunner({ accent }: { accent: string }) {
  const {
    preview, setImage, reset, epsilon, setEpsilon, method, setMethod, jpegQuality, setJpegQuality,
    run, running, result, error,
    categories, loadCategories, targetLabel, setTargetLabel,
  } = useAdversarial();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    setImage(dataUrl);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload a photo, then craft an adversarial perturbation designed to fool a pretrained ImageNet
          classifier — a tiny, mostly-invisible pixel change that flips its prediction to something
          wrong. Leave the target label blank for an untargeted attack (any wrong label counts), or
          type a specific ImageNet class to try to force that exact misprediction — a strictly harder
          attack, since it may need a larger epsilon to succeed. Then try a JPEG-recompression defense
          and see whether it actually recovers the correct label (often it doesn&apos;t fully — that&apos;s a
          real, honest finding about this defense&apos;s limits, not a broken demo).
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12" }}>
            Choose photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) onFileSelected(e.target.files[0]); e.target.value = ""; }} />
          {preview && (
            <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear</button>
          )}
        </div>

        {preview && (
          <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Attack:
                <select value={method} onChange={e => setMethod(e.target.value as "fgsm" | "pgd")}
                  className="text-xs rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text)" }}>
                  <option value="fgsm">FGSM (single-step)</option>
                  <option value="pgd">PGD (iterative, stronger)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Strength (epsilon): {epsilon.toFixed(3)}
                <input type="range" min={0.005} max={0.08} step={0.005} value={epsilon}
                  onChange={e => setEpsilon(Number(e.target.value))} className="w-24" />
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Defense JPEG quality: {jpegQuality}
                <input type="range" min={10} max={90} step={5} value={jpegQuality}
                  onChange={e => setJpegQuality(Number(e.target.value))} className="w-24" />
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Target label (optional):
                <input
                  type="text"
                  list="adversarial-target-labels"
                  placeholder="e.g. golden retriever"
                  value={targetLabel}
                  onFocus={loadCategories}
                  onChange={e => setTargetLabel(e.target.value)}
                  className="text-xs rounded px-2 py-1 w-40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text)" }}
                />
                <datalist id="adversarial-target-labels">
                  {(categories ?? []).map(c => <option key={c} value={c} />)}
                </datalist>
              </label>
              <button onClick={run} disabled={running}
                className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border"
                style={{ borderColor: `${accent}50`, color: accent, opacity: running ? 0.5 : 1 }}>
                {running ? "Running…" : "Run attack + defense"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {!result && preview && (
        <img src={preview} alt="Uploaded" className="rounded-xl max-w-xs" />
      )}

      {result && preview && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex gap-4 flex-wrap">
            <PredictionCard title="Original" src={preview} prediction={result.original} accent={accent} />
            <PredictionCard title="Adversarial" src={`data:image/png;base64,${result.adversarial.image}`} prediction={result.adversarial}
              badge={
                result.adversarial.target_label
                  ? result.adversarial.target_achieved
                    ? { text: "Target achieved", color: "#f87171" }
                    : { text: "Target not reached", color: "#fbbf24" }
                  : result.adversarial.fooled
                  ? { text: "Fooled", color: "#f87171" }
                  : { text: "Not fooled", color: "#34d399" }
              }
              accent={accent} />
            <PredictionCard title="After JPEG defense" src={`data:image/png;base64,${result.defended.image}`} prediction={result.defended}
              badge={
                result.defended.recovered
                  ? { text: "Recovered", color: "#34d399" }
                  : result.defended.disrupted
                  ? { text: "Disrupted, not recovered", color: "#fbbf24" }
                  : { text: "No effect", color: "#f87171" }
              }
              accent={accent} />
            <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>Perturbation (amplified ×8)</span>
              <img src={`data:image/png;base64,${result.perturbation_preview}`} alt="Amplified perturbation"
                className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>
                What was actually added — invisible at normal contrast, shown here amplified.
              </span>
            </div>
          </div>

          {result.adversarial.target_label && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {result.adversarial.target_achieved
                ? `Targeted attack succeeded — forced the prediction to the chosen target, "${result.adversarial.target_label}", not just any wrong label.`
                : `Targeted attack did NOT reach "${result.adversarial.target_label}" within this epsilon budget — it landed on a different (still wrong) label instead. Try a larger epsilon; targeted attacks are strictly harder to pull off than untargeted ones.`}
            </p>
          )}

          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            {result.defended.recovered
              ? "The defense fully recovered the original label here — this doesn't always happen."
              : result.defended.disrupted
              ? "The defense changed the prediction but landed on a different wrong label, not the original — a common, honest outcome for preprocessing-only defenses like this one."
              : "The defense had no measurable effect here — JPEG recompression doesn't reliably defeat every attack/strength combination."}
          </p>

          <div className="pt-4 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
              Where was the model looking? (Grad-CAM)
            </span>
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>For &quot;{result.original.label}&quot; (original)</span>
                <img src={`data:image/png;base64,${result.original.heatmap}`} alt="Original Grad-CAM"
                  className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>For &quot;{result.adversarial.label}&quot; (adversarial)</span>
                <img src={`data:image/png;base64,${result.adversarial.heatmap}`} alt="Adversarial Grad-CAM"
                  className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              </div>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              Warmer colors mark image regions that most drove that specific prediction. The label alone
              doesn&apos;t show why the model was fooled — but a shift in WHERE it&apos;s looking, for a photo
              that barely changed, does.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
