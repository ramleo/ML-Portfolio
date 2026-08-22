"use client";

import { useRef } from "react";
import { useFaceCloak, type ProtectionLevel } from "./useFaceCloak";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

const PROTECTION_COPY: Record<ProtectionLevel, { text: string; color: string; desc: string }> = {
  strong: {
    text: "Strong protection", color: "#34d399",
    desc: "The cloaked face's embedding landed well into different-person territory — a real face-recognition system would likely fail to match this to the original.",
  },
  moderate: {
    text: "Moderate protection", color: "#fbbf24",
    desc: "The embedding moved a meaningful amount but stayed in an ambiguous zone — try increasing the strength for a more confident disruption.",
  },
  weak: {
    text: "Weak protection", color: "#f87171",
    desc: "The embedding barely moved — a recognition system would likely still match this to the original face. Increase the strength and try again.",
  },
};

/** Upload a personal photo, cloak its face with an imperceptible
 * adversarial perturbation, and see how far the face's embedding moved —
 * a simplified, honest version of the real Fawkes privacy technique. See
 * useFaceCloak's docstring. */
export default function FaceCloakRunner({ accent }: { accent: string }) {
  const { preview, setImage, reset, epsilon, setEpsilon, run, running, result, error } = useFaceCloak();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    setImage(dataUrl);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  const protection = result?.protection_level ? PROTECTION_COPY[result.protection_level] : null;

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload a personal photo with a visible face. This tool adds an adversarial perturbation to
          just the face region — invisible to your eye — designed to push that face&apos;s
          representation away from where a face-recognition model naturally places it. This is a
          simplified, honest version of the real Fawkes privacy technique — see the User Guide for
          what it does and doesn&apos;t protect against.
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
          <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text3)" }}>
                Strength (epsilon): {epsilon.toFixed(3)}
                <input type="range" min={0.01} max={0.1} step={0.005} value={epsilon}
                  onChange={e => setEpsilon(Number(e.target.value))} className="w-32" />
              </label>
              <button onClick={run} disabled={running}
                className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border"
                style={{ borderColor: `${accent}50`, color: accent, opacity: running ? 0.5 : 1 }}>
                {running ? "Cloaking…" : "Cloak this photo"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {!result && preview && (
        <img src={preview} alt="Uploaded" className="rounded-xl max-w-xs" />
      )}

      {result && !result.found_face && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs" style={{ color: "#f87171" }}>
            {result.error ?? "No face detected in this photo."}
          </p>
        </div>
      )}

      {result?.found_face && preview && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>Original</span>
              <img src={preview} alt="Original" className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>Cloaked (visually near-identical)</span>
              <img src={`data:image/png;base64,${result.cloaked_image}`} alt="Cloaked"
                className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
            </div>
          </div>

          {protection && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                  Cosine similarity: {result.cosine_similarity?.toFixed(3)} (1.0 = identical, uncloaked)
                </span>
                <span className="text-[9px] px-1.5 py-px rounded shrink-0" style={{ background: `${protection.color}18`, color: protection.color }}>
                  {protection.text}
                </span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "var(--border)" }}>
                <div style={{
                  width: `${Math.round(((1 - (result.cosine_similarity ?? 1)) / 2) * 100)}%`,
                  height: "100%", background: protection.color, transition: "width 0.3s ease",
                }} />
              </div>
              <p className="text-[10px]" style={{ color: "var(--text3)" }}>{protection.desc}</p>
            </div>
          )}

          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            This protects THIS photo going forward — it does nothing for copies of this photo already
            online, and published research on the real Fawkes technique found protection can weaken
            against face-recognition models retrained after a cloaking method becomes known. See the
            User Guide for the full honest picture.
          </p>
        </div>
      )}
    </div>
  );
}
