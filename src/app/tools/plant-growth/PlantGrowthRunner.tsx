"use client";

import { useEffect, useRef, useState } from "react";
import { usePlantGrowthRunner, MIN_FRAMES, GROWTH_MIN_FRAMES, MAX_FRAMES, type GrowthFrame, type PlantTrack, type PlantComparison } from "./usePlantGrowthRunner";
import { WARN_COLOR, GrowthChart, FrameThumbnails, CompareView } from "./PlantGrowthCharts";
import { FramingCheck } from "./PlantGrowthFramingCheck";
import { CameraCapture } from "./PlantGrowthCamera";
import { SpeciesId } from "./PlantGrowthSpeciesId";
import { CalibrationModal, type Calibration } from "./PlantGrowthCalibration";
import { ExportCsvButton, downloadCsv, growthFramesToRows, compareToRows } from "./PlantGrowthCsv";
import { ProjectionControl, projectGrowth } from "./PlantGrowthProjection";
import { GifExportButton } from "./PlantGrowthGif";

const ERROR_COLOR = "#f87171";

// Card chrome matches ProjectCard.tsx / text-to-image's Card: var(--bg-glass)
// + backdrop blur + var(--border).
// Exported so PlantGrowthGroupMode.tsx (the "unordered batch" mode) can
// reuse the same chrome instead of duplicating it.
export function Card({ accent, children, className }: { accent: string; children: React.ReactNode; className?: string }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "var(--bg-glass)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    }}>
      <div className={className} style={{ padding: "1.5rem" }}>
        {children}
      </div>
    </div>
  );
}

/** Full-size view of a result thumbnail — click backdrop or Esc to close. */
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <img src={src} alt={alt} onClick={e => e.stopPropagation()}
        className="rounded-xl object-contain"
        style={{ maxWidth: "90vw", maxHeight: "90vh", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

type PendingPhoto = { dataUrl: string; label: string };

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Converts a single photo's compare-mode plants (ranked by size, no time
 * axis) into GrowthChart-shaped frames — ordered left-to-right by detected
 * position, growth% relative to the leftmost plant instead of the largest.
 * This is a manual reinterpretation the user opts into (a "growth stages"
 * toggle), not something the tool verifies: nothing in the pixels can
 * confirm several regions in one continuous photo are the same subject at
 * different times versus genuinely different plants — see the collage-seam
 * detector's docstring for why that signal doesn't exist here (no stitched-
 * photo boundary to find in a single continuous image/illustration).
 *
 * Uses relativePct (backend: leaf_pixel_count / largest plant's count), NOT
 * areaFraction (leaf pixels / that plant's OWN crop size) — the same
 * fraction-of-own-crop pitfall _compare_single_photo's backend docstring
 * already covers: a big plant's tight crop and a small plant's tight crop
 * can land on similar fractions, which would hide the real size difference
 * relativePct already correctly captures. */
function toStageFrames(plants: PlantComparison[]): GrowthFrame[] {
  const ordered = [...plants].sort((a, b) => a.index - b.index);
  const baseline = ordered[0]?.relativePct ?? 0;
  return ordered.map(p => ({
    label: `Plant ${p.index + 1}`,
    areaFraction: p.areaFraction,
    growthPct: baseline > 0 ? Math.round(((p.relativePct - baseline) / baseline) * 1000) / 10 : 0,
    lowConfidence: p.lowConfidence,
    maskPreviewUrl: p.maskPreviewUrl,
    greennessIndex: p.greennessIndex,
    leafCount: p.leafCount,
    leafPixelCount: p.leafPixelCount,
  }));
}

export default function PlantGrowthRunner({ accent }: { accent: string }) {
  const { measuring, result, error, run, reset } = usePlantGrowthRunner();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [autoDetect, setAutoDetect] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [compareAsStages, setCompareAsStages] = useState(false);
  const [framingCheckIndex, setFramingCheckIndex] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [projectionSteps, setProjectionSteps] = useState(1);

  const onFilesSelected = async (files: FileList) => {
    reset();
    setFramingCheckIndex(null);
    const arr = Array.from(files).slice(0, MAX_FRAMES);
    const dataUrls = await Promise.all(arr.map(readFileAsDataUrl));
    setPending(dataUrls.map((dataUrl, i) => ({ dataUrl, label: `Day ${i}` })));
  };

  const updateLabel = (i: number, label: string) => {
    setPending(p => p.map((photo, idx) => (idx === i ? { ...photo, label } : photo)));
  };

  const removePhoto = (i: number) => {
    reset();
    setFramingCheckIndex(null);
    setPending(p => p.filter((_, idx) => idx !== i));
  };

  const onPhotoCaptured = (dataUrl: string) => {
    reset();
    setFramingCheckIndex(null);
    setPending(p => [...p, { dataUrl, label: `Day ${p.length}` }]);
    setCameraOpen(false);
  };

  const onMeasure = () => {
    setSelectedPlant(0);
    setCompareAsStages(false);
    setProjectionSteps(1);
    const payload = pending.map(p => ({ image: p.dataUrl.split(",")[1] ?? "", label: p.label }));
    run(payload, autoDetect);
  };

  const growthPlants: PlantTrack[] | undefined = result?.mode === "growth" ? result.plants : undefined;
  const autoSplitCollage = result?.mode === "growth" && result.autoSplitCollage;
  const activeTrack: PlantTrack | undefined = growthPlants?.[selectedPlant];
  const frames: GrowthFrame[] | undefined = activeTrack?.frames;
  const hasLowConfidence = frames?.some(f => f.lowConfidence) ?? false;
  const projectedPct = frames ? projectGrowth(frames, projectionSteps) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card accent={accent} className="flex flex-col">
        <p className="text-sm mb-4" style={{ color: "var(--text3)" }}>
          Upload a single photo with multiple plants to compare their current size to each other (a
          before/after collage photo is auto-detected and split into a growth chart instead), or
          {" "}{GROWTH_MIN_FRAMES}-{MAX_FRAMES} photos of the same plant(s) taken on different days to chart
          growth over time. A local HSV green-hue threshold measures leaf area (no ML model, no API cost).
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} disabled={measuring}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff", opacity: measuring ? 0.5 : 1 }}>
            Choose photos
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ""; }} />
          <button onClick={() => setCameraOpen(true)} disabled={measuring}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
            style={{ borderColor: "var(--border)", color: "var(--text3)", opacity: measuring ? 0.5 : 1 }}>
            Take photo
          </button>
          {pending.length > 0 && (
            <button onClick={onMeasure} disabled={measuring || pending.length < MIN_FRAMES}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
              style={{ borderColor: accent, color: accent, opacity: measuring || pending.length < MIN_FRAMES ? 0.5 : 1 }}>
              {measuring ? "Measuring…" : pending.length === 1 ? "Compare plants (1)" : `Measure growth (${pending.length})`}
            </button>
          )}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--text3)" }}>
            <input type="checkbox" checked={autoDetect} onChange={e => setAutoDetect(e.target.checked)} />
            Auto-detect multiple plants
          </label>
        </div>

        {pending.length === 1 && (
          <p className="text-xs mt-2" style={{ color: "var(--text3)" }}>
            With 1 photo, plants found in it will be compared to each other. Add a second photo instead to chart growth over time.
          </p>
        )}
        {error && <p className="text-xs mt-2" style={{ color: ERROR_COLOR }}>{error}</p>}

        {pending.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-4">
            {pending.map((photo, i) => (
              <div key={i} className="flex flex-col gap-1 items-center">
                <div className="relative">
                  <img src={photo.dataUrl} alt="" className="rounded-lg object-cover" style={{ width: 84, height: 84 }} />
                  <button onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center"
                    style={{ background: ERROR_COLOR, color: "#fff" }}>
                    ×
                  </button>
                </div>
                <input value={photo.label} onChange={e => updateLabel(i, e.target.value)}
                  className="text-[10px] text-center rounded px-1 py-0.5 w-20"
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }} />
                {i > 0 && (
                  <button onClick={() => setFramingCheckIndex(i)}
                    className="text-[9px] underline"
                    style={{ color: "var(--text3)" }}>
                    Check framing
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {pending.length > 1 && (
          <div className="mt-2">
            <GifExportButton photoSrcs={pending.map(p => p.dataUrl)} filename="plant-timelapse.gif"
              frameAlignment={result?.mode === "growth" ? result.frameAlignment : undefined} />
          </div>
        )}

        <SpeciesId imageDataUrl={pending[0]?.dataUrl ?? null} accent={accent} />

        {pending[0] && (
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => setCalibrating(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border"
              style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
              {calibration ? "Recalibrate real-world size" : "Calibrate real-world size"}
            </button>
            {calibration && (
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                Calibrated — results below show estimated cm²
              </span>
            )}
          </div>
        )}
      </Card>

      {growthPlants && growthPlants.length > 0 && frames && frames.length > 0 && (
        <Card accent={accent} className="flex flex-col gap-4">
          {growthPlants.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {growthPlants.map(p => (
                <button key={p.index} onClick={() => setSelectedPlant(p.index)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
                  style={{
                    background: p.index === selectedPlant ? accent : "transparent",
                    color: p.index === selectedPlant ? "#0b0b12" : "var(--text3)",
                    border: p.index === selectedPlant ? "none" : "1px solid var(--border)",
                  }}>
                  Plant {p.index + 1}
                </button>
              ))}
            </div>
          )}

          {autoSplitCollage && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
              Detected this as a two-panel before/after photo — split into Panel 1 / Panel 2 and measured as
              growth over time automatically. Panel order is assumed left-to-right (or top-to-bottom); if that&apos;s
              reversed for your photo, the growth % below will be inverted.
            </p>
          )}

          {hasLowConfidence && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${WARN_COLOR}18`, color: WARN_COLOR, border: `1px solid ${WARN_COLOR}35` }}>
              One or more frames (marked below) found very little green content — check framing or lighting on those photos before trusting their measurement.
            </p>
          )}

          <GrowthChart frames={frames} accent={accent} projectedPct={projectedPct} />

          <ProjectionControl frames={frames} stepsAhead={projectionSteps} onStepsAheadChange={setProjectionSteps} projectedPct={projectedPct} accent={accent} />

          <FrameThumbnails frames={frames} accent={accent} onImageClick={(src, alt) => setLightbox({ src, alt })} cmPerPixel={calibration?.cmPerPixel} />

          <div className="self-center">
            <ExportCsvButton onClick={() => downloadCsv(`plant-${selectedPlant + 1}-growth.csv`, growthFramesToRows(frames, calibration?.cmPerPixel))} />
          </div>

          <p className="text-xs text-center max-w-2xl mx-auto" style={{ color: "var(--text3)" }}>
            Growth is leaf-pixel area relative to the first photo, not a real-world measurement — it only
            holds up if every photo is framed the same way. The magenta overlay above each thumbnail shows
            exactly what was counted as plant. Hover a thumbnail for its greenness index and leaf count.
          </p>
        </Card>
      )}

      {result?.mode === "compare" && result.plants.length > 0 && (
        <Card accent={accent} className="flex flex-col gap-4">
          {result.plants.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {([["rank", "Rank by size"], ["stages", "View as growth stages"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setCompareAsStages(key === "stages")}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
                  style={{
                    background: (key === "stages") === compareAsStages ? accent : "transparent",
                    color: (key === "stages") === compareAsStages ? "#0b0b12" : "var(--text3)",
                    border: (key === "stages") === compareAsStages ? "none" : "1px solid var(--border)",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {result.plants.some(p => p.lowConfidence) && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${WARN_COLOR}18`, color: WARN_COLOR, border: `1px solid ${WARN_COLOR}35` }}>
              One or more plants (marked below) found very little green content — check that box before trusting its measurement.
            </p>
          )}

          {compareAsStages ? (
            <>
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
                Treating these as one plant at different growth stages, left-to-right — this is your
                interpretation, not something detected automatically. There&apos;s no way to verify from the
                photo alone that these are really the same plant over time rather than different plants.
              </p>
              <GrowthChart frames={toStageFrames(result.plants)} accent={accent} />
              <FrameThumbnails frames={toStageFrames(result.plants)} accent={accent} onImageClick={(src, alt) => setLightbox({ src, alt })} cmPerPixel={calibration?.cmPerPixel} />
              <div className="self-center">
                <ExportCsvButton onClick={() => downloadCsv("plant-growth-stages.csv", growthFramesToRows(toStageFrames(result.plants), calibration?.cmPerPixel))} />
              </div>
            </>
          ) : (
            <>
              <CompareView plants={result.plants} accent={accent} onImageClick={(src, alt) => setLightbox({ src, alt })} cmPerPixel={calibration?.cmPerPixel} />
              <div className="self-center">
                <ExportCsvButton onClick={() => downloadCsv("plant-comparison.csv", compareToRows(result.plants, calibration?.cmPerPixel))} />
              </div>
              <p className="text-xs text-center max-w-2xl mx-auto" style={{ color: "var(--text3)" }}>
                Percentages compare these plants&apos; CURRENT leaf area to each other in this one photo — the
                largest plant found is 100%. This is not a growth measurement over time; upload a second photo
                of the same plants instead to chart that.
              </p>
            </>
          )}
        </Card>
      )}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {framingCheckIndex !== null && pending[0] && pending[framingCheckIndex] && (
        <FramingCheck
          baseline={pending[0].dataUrl}
          compare={pending[framingCheckIndex].dataUrl}
          compareLabel={pending[framingCheckIndex].label}
          onClose={() => setFramingCheckIndex(null)}
        />
      )}

      {cameraOpen && (
        <CameraCapture
          overlaySrc={pending[0]?.dataUrl ?? null}
          onCapture={onPhotoCaptured}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {calibrating && pending[0] && (
        <CalibrationModal
          photoSrc={pending[0].dataUrl}
          onSave={c => { setCalibration(c); setCalibrating(false); }}
          onClose={() => setCalibrating(false)}
        />
      )}
    </div>
  );
}
