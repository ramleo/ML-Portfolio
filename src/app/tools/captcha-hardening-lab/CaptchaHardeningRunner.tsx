"use client";

import { useRef } from "react";
import { useCaptchaHardening } from "./useCaptchaHardening";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

function ResultCard({ title, src, answer, correct, accent }: {
  title: string; src: string; answer: string; correct?: boolean; accent: string;
}) {
  const badge = correct === true ? { text: "Correct", color: "#34d399" }
    : correct === false ? { text: "Wrong", color: "#f87171" }
    : null;
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>{title}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied/server-generated data URI, not a static asset */}
      <img src={src} alt={title} className="rounded-lg w-full" style={{ background: "var(--bg)" }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-mono font-semibold truncate" style={{ color: "var(--text)" }}>
          &quot;{answer}&quot;
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

/** Upload a CAPTCHA image, see whether a vision-language model reads it,
 * then apply a classic (non-gradient) hardening perturbation and see
 * whether that read attempt still succeeds — the actual research question
 * is "how much hardening does it take," not "can we defeat this one
 * model." See useCaptchaHardening's docstring for the scope boundary:
 * user-uploaded images only, never a live CAPTCHA challenge. */
export default function CaptchaHardeningRunner({ accent }: { accent: string }) {
  const { preview, setImage, reset, intensity, setIntensity, groundTruth, setGroundTruth, run, running, result, error } = useCaptchaHardening();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    setImage(dataUrl);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload a CAPTCHA-style image (a distorted-text challenge you already have — this only reads an
          image you provide, it never contacts or solves a live CAPTCHA on a real website). A
          vision-language model attempts to read it, then a hardening slider stacks three classic,
          model-agnostic distortions — pixel noise, an occlusion wave, and reduced contrast/color — and
          the model tries again on the hardened version. The real question is how much hardening it takes
          before the model&apos;s answer breaks, not whether this one attempt succeeds.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12" }}>
            Choose CAPTCHA image
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) onFileSelected(e.target.files[0]); e.target.value = ""; }} />
          {preview && (
            <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear</button>
          )}
        </div>

        {preview && (
          <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied local preview, not a static asset */}
            <img src={preview} alt="Uploaded CAPTCHA" className="rounded-lg max-w-[240px]" style={{ background: "var(--bg)" }} />

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Hardening intensity: {intensity}
                <input type="range" min={0} max={100} step={5} value={intensity}
                  onChange={e => setIntensity(Number(e.target.value))} className="w-32" />
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                What it actually says (optional):
                <input type="text" value={groundTruth} onChange={e => setGroundTruth(e.target.value)}
                  placeholder="e.g. X7K9P"
                  className="text-xs rounded px-2 py-1 w-28" style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }} />
              </label>
            </div>

            <button onClick={run} disabled={running}
              className="self-start text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#0b0b12", opacity: running ? 0.6 : 1 }}>
              {running ? "Reading…" : "Test hardening"}
            </button>

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            {result && (
              <div className="flex gap-4 flex-wrap mt-2">
                <ResultCard title="Original" src={preview} answer={result.original_answer}
                  correct={result.original_correct} accent={accent} />
                <ResultCard title={`Hardened (intensity ${intensity})`} src={`data:image/png;base64,${result.perturbed_image}`}
                  answer={result.perturbed_answer} correct={result.perturbed_correct} accent={accent} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
