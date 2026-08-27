"use client";

import { useRef } from "react";
import { useWildlifeReid, type WildlifeReidResult, type ReidVerdict } from "./useWildlifeReid";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

const VERDICT_COPY: Record<ReidVerdict, { text: string; color: string }> = {
  same: { text: "Likely same individual", color: "#f59e0b" },
  uncertain: { text: "Uncertain", color: "#fbbf24" },
  different: { text: "Likely different individual", color: "#34d399" },
};

function GalleryGrid({
  photos, results, onRemove,
}: {
  photos: { preview: string }[];
  results: WildlifeReidResult["gallery"] | null;
  onRemove?: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {photos.map((photo, i) => {
        const r = results?.find(g => g.index === i);
        const verdict = r?.verdict ? VERDICT_COPY[r.verdict] : null;
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset */}
              <img src={photo.preview} alt={`Gallery ${i + 1}`}
                className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
              {onRemove && (
                <button onClick={() => onRemove(i)} aria-label={`Remove gallery photo ${i + 1}`}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                  ✕
                </button>
              )}
            </div>
            {r && (
              r.found_animal ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: verdict?.color }}>
                    {verdict?.text} ({Math.round((r.cosine_similarity ?? 0) * 100)}%)
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--text3)" }}>{r.animal_label}</span>
                </div>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>No animal detected</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function WildlifeReidRunner({ accent }: { accent: string }) {
  const {
    targetPreview, setTarget, gallery, addGalleryPhotos, removeGalleryPhoto, reset,
    run, running, result, error,
  } = useWildlifeReid();
  const targetInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  const onTargetSelected = async (file: File) => setTarget(await readFileAsDataUrl(file));

  const onGalleryFilesSelected = async (files: FileList) => {
    const photos = await Promise.all(
      Array.from(files).map(async file => {
        const dataUrl = await readFileAsDataUrl(file);
        return { preview: dataUrl, b64: dataUrl.split(",")[1] ?? "" };
      })
    );
    addGalleryPhotos(photos);
  };

  const bestMatch = result?.best_match_index != null
    ? { index: result.best_match_index, similarity: result.best_match_similarity ?? 0, verdict: result.best_match_verdict }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload a new sighting photo and a small gallery of past sighting photos of the same species.
          This crops the animal from each photo (reusing the site&apos;s existing 601-class object
          detector) and compares them with MegaDescriptor, a foundation model built specifically for
          individual animal re-identification — the same class of embedding-similarity search a
          backyard-camera-trap tool would use to notice a repeat visitor.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          Not a validated identification system — a &quot;does this look like the same individual&quot;
          signal, not proof. Nothing is stored; only the photos in this one request are compared.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wide block mb-2" style={{ color: accent }}>
              1. New sighting photo
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => targetInputRef.current?.click()}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ background: accent, color: "#fff" }}>
                Choose photo
              </button>
              <input ref={targetInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) onTargetSelected(e.target.files[0]); e.target.value = ""; }} />
              {targetPreview && (
                <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear all</button>
              )}
            </div>
            {targetPreview && (
              // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset
              <img src={targetPreview} alt="New sighting" className="rounded-lg mt-3 max-w-[160px]" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
            )}
          </div>

          {targetPreview && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide block mb-2" style={{ color: accent }}>
                2. Past sightings ({gallery.length}/10 photos)
              </span>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <button onClick={() => galleryInputRef.current?.click()}
                  disabled={gallery.length >= 10}
                  className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
                  style={{ borderColor: `${accent}50`, color: accent, opacity: gallery.length >= 10 ? 0.5 : 1 }}>
                  Add past sightings
                </button>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { if (e.target.files?.length) onGalleryFilesSelected(e.target.files); e.target.value = ""; }} />
              </div>
              {gallery.length > 0 && (
                <GalleryGrid photos={gallery} results={null} onRemove={removeGalleryPhoto} />
              )}
            </div>
          )}

          {targetPreview && gallery.length > 0 && (
            <button onClick={run} disabled={running}
              className="self-start text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff", opacity: running ? 0.6 : 1 }}>
              {running ? "Comparing…" : "Compare sightings"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {result && !result.target_found_animal && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs" style={{ color: "#f87171" }}>
            No animal detected in the new sighting photo — try a clearer photo where the animal is a
            larger, more visible part of the frame.
          </p>
        </div>
      )}

      {result?.target_found_animal && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <p className="text-[10px]" style={{ color: "var(--text3)" }}>
            Detected in new photo: <strong style={{ color: "var(--text2)" }}>{result.target_animal_label}</strong>
          </p>
          {bestMatch ? (
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg" style={{ background: `${VERDICT_COPY[bestMatch.verdict ?? "uncertain"].color}12` }}>
              <span className="text-xs font-semibold" style={{ color: VERDICT_COPY[bestMatch.verdict ?? "uncertain"].color }}>
                Best match: past sighting #{bestMatch.index + 1} at {Math.round(bestMatch.similarity * 100)}% similarity — {VERDICT_COPY[bestMatch.verdict ?? "uncertain"].text.toLowerCase()}.
              </span>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text3)" }}>No animals were detected in any past-sighting photo.</p>
          )}

          <GalleryGrid photos={gallery} results={result.gallery} />
        </div>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> this is not a
        validated wildlife-identification system — the same/uncertain/different bands are informed by
        one real local test, not a calibrated threshold from a proper multi-individual validation set.
        It skips the pose-normalization and multi-crop-averaging techniques real re-ID research
        pipelines use. MegaDescriptor is licensed CC-BY-NC-4.0 (non-commercial).
      </div>
    </div>
  );
}
