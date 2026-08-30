"use client";

import { useRef } from "react";
import { useFaceReidDemo, type ReidSearchResult, type ReidVerdict } from "./useFaceReidDemo";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

const VERDICT_COPY: Record<ReidVerdict, { text: string; color: string }> = {
  same: { text: "Likely same person", color: "#f87171" },
  uncertain: { text: "Uncertain", color: "#fbbf24" },
  different: { text: "Likely different person", color: "#34d399" },
};

function GalleryGrid({
  photos, results, onRemove,
}: {
  photos: { preview: string }[];
  results: ReidSearchResult["gallery"] | null;
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
              r.found_face ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold" style={{ color: verdict?.color }}>
                    {verdict?.text} ({Math.round((r.cosine_similarity ?? 0) * 100)}%)
                  </span>
                </div>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>No face detected</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Uploads a target photo + small gallery, runs a real face-embedding
 * similarity search between them (the "shows the attack" counterpart to
 * Face Cloak's "shows the defense"), then optionally cloaks the target via
 * Face Cloak's own endpoint and re-runs the search to show the match break.
 * See useFaceReidDemo's docstring. */
export default function FaceReidDemoRunner({ accent }: { accent: string }) {
  const {
    targetPreview, setTarget, gallery, addGalleryPhotos, removeGalleryPhoto, reset,
    run, running, result, error,
    protectAndRetest, protecting, protectedPreview, protectedResult, protectError,
  } = useFaceReidDemo();
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
          Upload a target photo (the kind of photo someone might post publicly) and a small gallery of
          other real photos of people. This runs the same face-embedding similarity search that
          Clearview-style re-identification systems rely on to rank which gallery photo is most likely
          the same person as the target.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          This does not search the internet or any real database — it only compares photos you upload
          in this one request, and nothing is stored. It demonstrates the mechanism, not a real lookup.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wide block mb-2" style={{ color: accent }}>
              1. Target photo
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => targetInputRef.current?.click()}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{ background: accent, color: "#fff" }}>
                Choose target photo
              </button>
              <input ref={targetInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) onTargetSelected(e.target.files[0]); e.target.value = ""; }} />
              {targetPreview && (
                <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear all</button>
              )}
            </div>
            {targetPreview && (
              // eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset
              <img src={targetPreview} alt="Target" className="rounded-lg mt-3 max-w-[160px]" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
            )}
          </div>

          {targetPreview && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide block mb-2" style={{ color: accent }}>
                2. Gallery ({gallery.length}/10 photos)
              </span>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <button onClick={() => galleryInputRef.current?.click()}
                  disabled={gallery.length >= 10}
                  className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
                  style={{ borderColor: `${accent}50`, color: accent, opacity: gallery.length >= 10 ? 0.5 : 1 }}>
                  Add gallery photos
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
              {running ? "Searching…" : "Run search"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {result && !result.target_found_face && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs" style={{ color: "#f87171" }}>No face detected in the target photo.</p>
        </div>
      )}

      {result?.target_found_face && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          {bestMatch ? (
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg" style={{ background: `${VERDICT_COPY[bestMatch.verdict ?? "uncertain"].color}12` }}>
              <span className="text-xs font-semibold" style={{ color: VERDICT_COPY[bestMatch.verdict ?? "uncertain"].color }}>
                Best match: gallery photo #{bestMatch.index + 1} at {Math.round(bestMatch.similarity * 100)}% similarity — {VERDICT_COPY[bestMatch.verdict ?? "uncertain"].text.toLowerCase()}.
              </span>
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>
                A similarity-based re-identification system would likely flag this pairing.
              </span>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text3)" }}>No faces were detected in any gallery photo.</p>
          )}

          <GalleryGrid photos={gallery} results={result.gallery} />

          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={protectAndRetest} disabled={protecting}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
              style={{ borderColor: `${accent}50`, color: accent, opacity: protecting ? 0.5 : 1 }}>
              {protecting ? "Protecting…" : "Protect target & re-test"}
            </button>
            <p className="text-[10px] mt-2" style={{ color: "var(--text3)" }}>
              Cloaks the target photo (same technique as the Face Cloak tool) and re-runs this exact
              search to show whether the match breaks.
            </p>
          </div>
        </div>
      )}

      {protectError && <p className="text-xs px-1" style={{ color: "#f87171" }}>{protectError}</p>}

      {protectedResult?.target_found_face && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
            After protection
          </span>
          <div className="flex gap-4 flex-wrap items-start">
            {protectedPreview && (
              // eslint-disable-next-line @next/next/no-img-element -- server-generated data URI, not a static asset
              <img src={protectedPreview} alt="Protected target" className="rounded-lg" style={{ width: 120, aspectRatio: "1 / 1", objectFit: "cover" }} />
            )}
            <div className="flex-1 min-w-[220px]">
              {protectedResult.best_match_index != null ? (
                <p className="text-xs font-semibold" style={{ color: VERDICT_COPY[protectedResult.best_match_verdict ?? "uncertain"].color }}>
                  New best match: gallery photo #{protectedResult.best_match_index + 1} at{" "}
                  {Math.round((protectedResult.best_match_similarity ?? 0) * 100)}% —{" "}
                  {VERDICT_COPY[protectedResult.best_match_verdict ?? "uncertain"].text.toLowerCase()}.
                </p>
              ) : (
                <p className="text-xs font-semibold" style={{ color: "#34d399" }}>No confident match found after protection.</p>
              )}
              {bestMatch && (() => {
                const sameSlot = protectedResult.gallery.find(g => g.index === bestMatch.index);
                return sameSlot?.cosine_similarity != null ? (
                  <p className="text-[10px] mt-1" style={{ color: "var(--text3)" }}>
                    Similarity to gallery photo #{bestMatch.index + 1} moved from{" "}
                    {Math.round(bestMatch.similarity * 100)}% to {Math.round(sameSlot.cosine_similarity * 100)}%.
                  </p>
                ) : null;
              })()}
            </div>
          </div>
          <GalleryGrid photos={gallery} results={protectedResult.gallery} />
        </div>
      )}
    </div>
  );
}
