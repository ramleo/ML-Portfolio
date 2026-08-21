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

function SmoothedCard({ result, accent }: { result: NonNullable<ReturnType<typeof useAdversarial>["result"]>; accent: string }) {
  const s = result.smoothed;
  const badge = s.recovered
    ? { text: "Recovered", color: "#34d399" }
    : s.disrupted
    ? { text: "Disrupted, not recovered", color: "#fbbf24" }
    : { text: "No effect", color: "#f87171" };
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
        After randomized smoothing
      </span>
      <div className="flex flex-col gap-2 justify-center rounded-lg p-3" style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[9px]" style={{ color: "var(--text3)" }}>
          Majority vote over {s.num_samples} noised copies (σ={s.sigma})
        </span>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ width: `${Math.round(s.vote_confidence * 100)}%`, height: "100%", background: accent }} />
        </div>
        <span className="text-[9px]" style={{ color: "var(--text3)" }}>
          Vote agreement: {Math.round(s.vote_confidence * 100)}%
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
          {s.label} ({Math.round(s.confidence * 100)}%)
        </span>
        <span className="text-[9px] px-1.5 py-px rounded shrink-0" style={{ background: `${badge.color}18`, color: badge.color }}>
          {badge.text}
        </span>
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
    checkTransfer, setCheckTransfer, patchFrac, setPatchFrac, maxQueries, setMaxQueries,
  } = useAdversarial();
  const isPatch = method === "patch";
  const isBlackbox = method === "blackbox";
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
          Upload a photo, then craft an adversarial attack against a pretrained ImageNet classifier — a
          tiny, mostly-invisible pixel change (FGSM/PGD), a visible &quot;sticker&quot; patch, or a black-box
          attack that never sees the model&apos;s gradients, only its predictions. Leave the target label
          blank for an untargeted attack (any wrong label counts), or type a specific ImageNet class to
          try to force that exact misprediction — a strictly harder attack. Then try a JPEG-recompression
          defense and randomized smoothing, and see whether either actually recovers the correct label
          (often neither does fully — that&apos;s a real, honest finding about these defenses&apos; limits,
          not a broken demo).
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
                <select value={method} onChange={e => setMethod(e.target.value as "fgsm" | "pgd" | "patch" | "blackbox")}
                  className="text-xs rounded px-2 py-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text)" }}>
                  <option value="fgsm">FGSM (single-step)</option>
                  <option value="pgd">PGD (iterative, stronger)</option>
                  <option value="patch">Adversarial patch (visible sticker)</option>
                  <option value="blackbox">Black-box (no gradients, query-only)</option>
                </select>
              </label>
              {isPatch ? (
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                  Patch size: {Math.round(patchFrac * 100)}% of image
                  <input type="range" min={0.05} max={0.35} step={0.01} value={patchFrac}
                    onChange={e => setPatchFrac(Number(e.target.value))} className="w-24" />
                </label>
              ) : (
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                  {isBlackbox ? "Per-query step:" : "Strength (epsilon):"} {epsilon.toFixed(3)}
                  <input type="range" min={0.005} max={0.08} step={0.005} value={epsilon}
                    onChange={e => setEpsilon(Number(e.target.value))} className="w-24" />
                </label>
              )}
              {isBlackbox && (
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                  Query budget: {maxQueries}
                  <input type="range" min={200} max={3000} step={100} value={maxQueries}
                    onChange={e => setMaxQueries(Number(e.target.value))} className="w-24" />
                </label>
              )}
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
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text3)" }}>
                <input type="checkbox" checked={checkTransfer} onChange={e => setCheckTransfer(e.target.checked)} />
                Check transferability (ResNet18)
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
            <SmoothedCard result={result} accent={accent} />
            <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                {isPatch ? "The patch region" : "Perturbation (amplified ×8)"}
              </span>
              <img src={`data:image/png;base64,${result.perturbation_preview}`} alt={isPatch ? "Patch region" : "Amplified perturbation"}
                className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>
                {isPatch
                  ? "The optimized patch itself — directly visible, unlike the subtle FGSM/PGD perturbation."
                  : "What was actually added — invisible at normal contrast, shown here amplified."}
              </span>
            </div>
          </div>

          {result.adversarial.target_label && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {result.adversarial.target_achieved
                ? `Targeted attack succeeded — forced the prediction to the chosen target, "${result.adversarial.target_label}", not just any wrong label.${isPatch ? ` Took ${result.adversarial.patch_steps} optimization steps.` : isBlackbox ? ` Took ${result.adversarial.queries_used} queries.` : ""}`
                : isPatch
                ? `Targeted patch did NOT reach "${result.adversarial.target_label}" within the ${result.adversarial.patch_steps}-step budget — a real, honest failure, not a bug. Real testing found a bigger patch converges far faster; try increasing patch size.`
                : isBlackbox
                ? `Targeted black-box attack did NOT reach "${result.adversarial.target_label}" within the ${result.adversarial.queries_used}-query budget — a real, expected outcome, not a bug. Real testing found targeted black-box attacks are dramatically harder than untargeted ones and often don't converge within a request-sized query budget at all; a bigger query budget or a larger per-query step may help, but isn't guaranteed to.`
                : `Targeted attack did NOT reach "${result.adversarial.target_label}" within this epsilon budget — it landed on a different (still wrong) label instead. Try a larger epsilon; targeted attacks are strictly harder to pull off than untargeted ones.`}
            </p>
          )}
          {isPatch && !result.adversarial.target_label && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              Untargeted patches tend to fool the classifier almost instantly — this one took only{" "}
              {result.adversarial.patch_steps} optimization step{result.adversarial.patch_steps === 1 ? "" : "s"}.
            </p>
          )}
          {isBlackbox && !result.adversarial.target_label && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {result.adversarial.fooled
                ? `Untargeted black-box attacks tend to converge reasonably fast — this one used ${result.adversarial.queries_used} queries, no gradient access at all.`
                : `Did not fool the classifier within the ${result.adversarial.queries_used}-query budget — try a larger query budget or per-query step.`}
            </p>
          )}

          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            <strong style={{ color: "var(--text2)" }}>JPEG defense: </strong>
            {result.defended.recovered
              ? "The defense fully recovered the original label here — this doesn't always happen."
              : result.defended.disrupted
              ? "The defense changed the prediction but landed on a different wrong label, not the original — a common, honest outcome for preprocessing-only defenses like this one."
              : "The defense had no measurable effect here — JPEG recompression doesn't reliably defeat every attack/strength combination."}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            <strong style={{ color: "var(--text2)" }}>Randomized smoothing: </strong>
            {result.smoothed.recovered
              ? `The noisy-vote defense recovered the original label, but with only ${Math.round(result.smoothed.vote_confidence * 100)}% agreement across samples — a real but unstable win, not a confident one (this exact vote can shift between runs due to the random noise itself).`
              : result.smoothed.disrupted
              ? "The noise vote landed on yet another wrong label, not the original — some disruption, no recovery."
              : "The vote agreed with the adversarial label almost every time — this defense had essentially no effect at this attack strength."}
          </p>

          {result.transfer && (
            <div className="pt-4 flex flex-col gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
                Does it transfer to a different model? (ResNet18)
              </span>
              <div className="flex gap-4 flex-wrap text-xs">
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>ResNet18 on original photo</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {result.transfer.original.label} ({Math.round(result.transfer.original.confidence * 100)}%)
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span style={{ color: "var(--text3)" }}>ResNet18 on the SAME adversarial image</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {result.transfer.adversarial.label} ({Math.round(result.transfer.adversarial.confidence * 100)}%)
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-px rounded shrink-0 self-start"
                  style={{
                    background: result.transfer.transferred ? "#f8717118" : "#34d39918",
                    color: result.transfer.transferred ? "#f87171" : "#34d399",
                  }}>
                  {result.transfer.transferred ? "Transferred" : "Did not transfer"}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>
                {result.transfer.transferred
                  ? "This perturbation was crafted with zero gradient access to ResNet18, yet it changed ResNet18's own prediction too — a real black-box risk: an attacker doesn't need access to the exact model you're running."
                  : "ResNet18's prediction stayed correct despite the same adversarial image fooling MobileNetV2 — this specific perturbation did not transfer to a different architecture. Real testing found this varies a lot by attack strength and method (see mm_adversarial.py's module docstring)."}
              </p>
            </div>
          )}

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
