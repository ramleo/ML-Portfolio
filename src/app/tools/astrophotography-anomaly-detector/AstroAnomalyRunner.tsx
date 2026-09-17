"use client";

import { useRef, useState } from "react";
import { useAstroAnomalyDetect } from "./useAstroAnomalyDetect";

const MAX_PHOTOS = 30;

function Section({ title, children, anchor }: { title: string; children: React.ReactNode; anchor?: string }) {
  return (
    <div data-wt={anchor} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function AstroAnomalyRunner({ accent }: { accent: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { detect, running, result, error, reset } = useAstroAnomalyDetect();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFilesSelected = (fileList: FileList) => {
    const newFiles = Array.from(fileList).slice(0, MAX_PHOTOS - files.length);
    setFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    reset();
  };

  const removePhoto = (i: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    reset();
  };

  const run = () => {
    if (files.length >= 2) detect(files);
  };

  const clear = () => {
    setFiles([]);
    setPreviews([]);
    reset();
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Upload 5-30 photos from one fixed-tripod night-sky session, in order">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset */}
              <img src={p} alt={`Photo ${i + 1}`} className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              <span className="absolute top-1 left-1 text-[9px] px-1 py-[1px] rounded font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>{i + 1}</span>
              <button onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                ✕
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <button data-wt="astro-add" onClick={() => inputRef.current?.click()}
              className="rounded-lg flex items-center justify-center text-xs font-semibold"
              style={{ aspectRatio: "1 / 1", background: "var(--surface2)", border: "1px dashed var(--border)", color: "var(--text3)" }}>
              + Add
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => e.target.files && onFilesSelected(e.target.files)} />

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button data-wt="astro-detect" onClick={run} disabled={running || files.length < 2}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Differencing frames + Hough transform…" : "Detect anomalies"}
          </button>
          {(files.length > 0 || result) && (
            <button onClick={clear} disabled={running} className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear
            </button>
          )}
          <span className="text-xs" style={{ color: "var(--text3)" }}>{files.length} / {MAX_PHOTOS} photos (min 2)</span>
        </div>
      </Section>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs" style={{ color: "#f59e0b" }}>⚠ {w}</li>
              ))}
            </ul>
          )}

          <Section anchor="astro-anomalies" title={result.anomalies.length > 0
            ? `${result.anomalies.length} anomal${result.anomalies.length === 1 ? "y" : "ies"} detected across ${result.frame_count} frames`
            : `No anomalies crossed the detection threshold across ${result.frame_count} frames`}>
            {result.anomalies.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>
                This means nothing produced a strong enough one-sided (monopole) streak — not a guarantee nothing happened. A faint meteor can fall below the threshold.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {result.anomalies.map((a, i) => (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 preview from API response, not a static asset */}
                    <img src={`data:image/jpeg;base64,${a.preview}`} alt={`Anomaly ${i + 1}`} className="w-full" style={{ background: "#000" }} />
                    <div className="p-2 text-xs" style={{ color: "var(--text2)" }}>
                      <div className="font-semibold" style={{ color: accent }}>{a.label}</div>
                      <div>Frames {a.frame_pair[0] + 1}–{a.frame_pair[1] + 1} · {a.length_px}px · {a.angle_deg}°</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section anchor="astro-median" title="Median stack (transients rejected, stars preserved)">
            {/* eslint-disable-next-line @next/next/no-img-element -- base64 preview from API response, not a static asset */}
            <img src={`data:image/jpeg;base64,${result.median_stack}`} alt="Median stack" className="w-full rounded-lg" style={{ background: "#000" }} />
            <p className="text-xs mt-2" style={{ color: "var(--text3)" }}>
              Pixel-wise median across all uploaded frames, as uploaded (no star-based alignment). Meteors/satellites are outliers at each pixel and get rejected; stars, present in every frame, survive.
            </p>
          </Section>
        </>
      )}

      <div data-wt="astro-limits" className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> no star-based registration/plate-solving — this assumes a static
        tripod and compares frames exactly as uploaded, in order. It does not distinguish meteors from satellites (tested against synthetic ground
        truth and found unreliable to do with position drift alone — a satellite&apos;s frame-to-frame shift is almost entirely along its own line
        direction, which looks geometrically like a stationary flash). Every detection is labeled &quot;possible meteor or satellite trail,&quot; never a
        confident classification — always check the preview crop visually.
      </div>
    </div>
  );
}
