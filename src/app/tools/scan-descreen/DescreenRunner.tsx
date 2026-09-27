"use client";

import { useRef } from "react";
import { useDescreen } from "./useDescreen";

export default function DescreenRunner({ accent }: { accent: string }) {
  const { fileName, original, setFile, reset, run, running, result, error } = useDescreen();
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
        style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Upload a scanned or screen-photographed image.</span>{" "}
        The tool finds the periodic halftone/moire ripple in the image&apos;s frequency spectrum, notches those
        peaks out, and transforms back — a classic, non-generative clean-up that can&apos;t invent detail.
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => inputRef.current?.click()}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg" style={{ background: accent, color: "#fff" }}>
            Choose image
          </button>
          <button onClick={run} disabled={!original || running}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: original ? accent : "var(--surface)", color: original ? "#fff" : "var(--text3)" }}>
            {running ? "Descreening…" : "Descreen"}
          </button>
          {fileName && (
            <button onClick={() => { reset(); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-[12px] px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
          {fileName && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{fileName}</span>}
        </div>
        {running && (
          <p className="text-[12px]" style={{ color: "var(--text3)" }}>
            Running the FFT and notch filter on the server — usually a few seconds.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: `1px solid ${accent}44` }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13px] font-bold px-3 py-1 rounded-full"
                style={{ background: `${accent}1e`, color: accent, border: `1px solid ${accent}55` }}>
                {result.removed ? `${result.removed} periodic pattern${result.removed === 1 ? "" : "s"} removed` : "No periodic pattern found"}
              </span>
              {result.width && (
                <span className="text-[11px] ml-auto px-2 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--text3)" }}>
                  {result.width}×{result.height}
                </span>
              )}
            </div>
            <p className="text-[12px] mt-2" style={{ color: "var(--text2)" }}>
              {result.removed
                ? "The circled spikes in the spectrum below were notched out. Compare the before/after — a real screen ripple should be gone while the picture is preserved."
                : "No sharp periodic peak stood far enough above the spectrum's noise to notch — the image was returned essentially unchanged, which is the honest result when there's no screen pattern to remove."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <figure className="rounded-2xl overflow-hidden m-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <figcaption className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>Before</figcaption>
              {original && <img src={`data:image/*;base64,${original}`} alt="Original uploaded image" className="w-full h-auto block" />}
            </figure>
            <figure className="rounded-2xl overflow-hidden m-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <figcaption className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: "var(--border)", color: accent }}>After (descreened)</figcaption>
              {result.cleaned && <img src={`data:image/png;base64,${result.cleaned}`} alt="Descreened image" className="w-full h-auto block" />}
            </figure>
          </div>

          {result.spectrum && (
            <figure className="rounded-2xl overflow-hidden m-0" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <figcaption className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
                Frequency spectrum — removed peaks circled
              </figcaption>
              <img src={`data:image/png;base64,${result.spectrum}`} alt="Log-magnitude frequency spectrum with the removed periodic peaks circled" className="w-full h-auto block" style={{ maxWidth: 520, margin: "0 auto" }} />
            </figure>
          )}
        </div>
      )}
    </div>
  );
}
