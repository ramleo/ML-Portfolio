"use client";

import { useRef, useState } from "react";
import {
  usePlantGrowthGroupRunner, GROUP_MIN_PHOTOS, type ProposedGroup,
} from "./usePlantGrowthGroupRunner";
import { MAX_FRAMES } from "./usePlantGrowthRunner";
import { GrowthChart, FrameThumbnails, WARN_COLOR } from "./PlantGrowthCharts";
import { Card, Lightbox, readFileAsDataUrl } from "./PlantGrowthRunner";
import { CameraCapture } from "./PlantGrowthCamera";
import { ExportCsvButton, downloadCsv, growthFramesToRows } from "./PlantGrowthCsv";
import { ProjectionControl, projectGrowth } from "./PlantGrowthProjection";
import { GifExportButton } from "./PlantGrowthGif";

const ERROR_COLOR = "#f87171";

const ORDER_SOURCE_TEXT: Record<ProposedGroup["orderSource"], string> = {
  exif: "Ordered by photo timestamp.",
  leaf_area_fallback: "No timestamp found in any photo — ordered by estimated size, smallest first. Verify this looks right.",
  mixed: "Some photos had no timestamp — those were slotted in by estimated size relative to the ones that did. Verify this looks right.",
};

/** "I have a mixed, unordered batch — figure it out" mode: uploads with no
 * labels/order, proposes a plant grouping + chronological order via the
 * backend's clip-ViT-B-32 similarity clustering (mm_plant_growth_reid.py),
 * then requires the user to REVIEW AND CONFIRM (or edit) that proposal
 * before any measurement runs — clustering is a similarity guess, not a
 * verified fact, and a silently-wrong grouping would corrupt a growth
 * curve. Merge/split controls are simple button-based moves rather than
 * drag-and-drop: this repo has no DnD library, and ≤30 photos across a
 * handful of groups doesn't need one. */
export default function PlantGrowthGroupMode({ accent }: { accent: string }) {
  const { proposing, proposed, measuring, result, error, propose, confirmAndMeasure, reset } = usePlantGrowthGroupRunner();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [editedGroups, setEditedGroups] = useState<ProposedGroup[] | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [projectionSteps, setProjectionSteps] = useState(1);

  const onFilesSelected = async (files: FileList) => {
    reset();
    setEditedGroups(null);
    const arr = Array.from(files).slice(0, MAX_FRAMES);
    const dataUrls = await Promise.all(arr.map(readFileAsDataUrl));
    setPhotos(dataUrls);
  };

  const onPhotoCaptured = (dataUrl: string) => {
    reset();
    setEditedGroups(null);
    setPhotos(p => [...p, dataUrl]);
    setCameraOpen(false);
  };

  const removePhoto = (i: number) => {
    reset();
    setEditedGroups(null);
    setPhotos(p => p.filter((_, idx) => idx !== i));
  };

  const onGroup = () => {
    setEditedGroups(null);
    propose(photos.map(p => p.split(",")[1] ?? ""));
  };

  const groups = editedGroups ?? proposed?.groups ?? [];

  const mergeInto = (fromGroupId: number, intoGroupId: number) => {
    setEditedGroups(prev => {
      const base = prev ?? proposed?.groups ?? [];
      const from = base.find(g => g.groupId === fromGroupId);
      if (!from) return base;
      return base
        .filter(g => g.groupId !== fromGroupId)
        .map(g => g.groupId === intoGroupId
          ? { ...g, photoIndices: [...g.photoIndices, ...from.photoIndices], clusterConfidence: "high" as const, ambiguousWith: [] }
          : g);
    });
  };

  const movePhoto = (photoIndex: number, fromGroupId: number, toGroupId: number) => {
    setEditedGroups(prev => {
      const base = prev ?? proposed?.groups ?? [];
      return base.map(g => {
        if (g.groupId === fromGroupId) return { ...g, photoIndices: g.photoIndices.filter(i => i !== photoIndex) };
        if (g.groupId === toGroupId) return { ...g, photoIndices: [...g.photoIndices, photoIndex] };
        return g;
      }).filter(g => g.photoIndices.length > 0);
    });
  };

  const onRunMeasurement = () => {
    confirmAndMeasure(
      photos.map(p => p.split(",")[1] ?? ""),
      groups.map(g => ({ groupId: g.groupId, photoIndices: g.photoIndices })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card accent={accent} className="flex flex-col">
        <p className="text-sm mb-4" style={{ color: "var(--text3)" }}>
          Dump in a mixed batch of photos with no labels and no particular order — even photos of more
          than one plant, interleaved. The tool groups them by which plant they show (visual similarity)
          and orders each group chronologically (photo timestamp when available, else estimated size),
          then shows you the proposed grouping to confirm or fix before measuring anything.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} disabled={proposing || measuring}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12", opacity: proposing || measuring ? 0.5 : 1 }}>
            Choose photos
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ""; }} />
          <button onClick={() => setCameraOpen(true)} disabled={proposing || measuring}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
            style={{ borderColor: "var(--border)", color: "var(--text3)", opacity: proposing || measuring ? 0.5 : 1 }}>
            Take photo
          </button>
          {photos.length > 0 && (
            <button onClick={onGroup} disabled={proposing || measuring || photos.length < GROUP_MIN_PHOTOS}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors border"
              style={{ borderColor: accent, color: accent, opacity: proposing || measuring || photos.length < GROUP_MIN_PHOTOS ? 0.5 : 1 }}>
              {proposing ? "Grouping…" : `Group ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>

        {photos.length > 0 && photos.length < GROUP_MIN_PHOTOS && (
          <p className="text-xs mt-2" style={{ color: "var(--text3)" }}>Add at least {GROUP_MIN_PHOTOS} photos.</p>
        )}
        {photos.some(p => p) && photos.length > 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--text3)" }}>
            Camera-captured photos have no timestamp metadata and always fall back to size-based ordering.
          </p>
        )}
        {error && <p className="text-xs mt-2" style={{ color: ERROR_COLOR }}>{error}</p>}

        {photos.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-4">
            {photos.map((dataUrl, i) => (
              <div key={i} className="relative">
                <img src={dataUrl} alt="" className="rounded-lg object-cover" style={{ width: 84, height: 84 }} />
                <button onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center"
                  style={{ background: ERROR_COLOR, color: "#fff" }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {proposed && groups.length > 0 && !result && (
        <Card accent={accent} className="flex flex-col gap-4">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Review the proposed grouping before measuring
          </p>

          {groups.map(g => (
            <div key={g.groupId} className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: accent }}>
                  Group {g.groupId + 1} · {g.photoIndices.length} photo{g.photoIndices.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="text-[11px] mb-2" style={{ color: "var(--text3)" }}>{ORDER_SOURCE_TEXT[g.orderSource]}</p>

              {g.clusterConfidence === "ambiguous" && (
                <p className="text-[11px] px-2 py-1.5 rounded mb-2" style={{ background: `${WARN_COLOR}18`, color: WARN_COLOR, border: `1px solid ${WARN_COLOR}35` }}>
                  {g.reason
                    ? `Not confident this is a distinct plant (${g.reason}).`
                    : "This group looks visually close to another group — it might be the same plant split in two."}
                  {g.ambiguousWith.length > 0 && (
                    <span className="ml-1">
                      Possibly the same as:{" "}
                      {g.ambiguousWith.map(otherId => (
                        <button key={otherId} onClick={() => mergeInto(g.groupId, otherId)}
                          className="underline font-semibold" style={{ color: WARN_COLOR }}>
                          Merge into Group {otherId + 1}
                        </button>
                      ))}
                    </span>
                  )}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {g.photoIndices.map(photoIdx => (
                  <div key={photoIdx} className="flex flex-col items-center gap-1">
                    <img src={photos[photoIdx]} alt="" className="rounded object-cover" style={{ width: 60, height: 60 }} />
                    {groups.length > 1 && (
                      <select
                        value={g.groupId}
                        onChange={e => movePhoto(photoIdx, g.groupId, Number(e.target.value))}
                        className="text-[9px] rounded px-1"
                        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text3)" }}>
                        {groups.map(og => (
                          <option key={og.groupId} value={og.groupId}>Group {og.groupId + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2">
                <GifExportButton photoSrcs={g.photoIndices.map(i => photos[i])} filename={`plant-group-${g.groupId + 1}-timelapse.gif`} />
              </div>
            </div>
          ))}

          {proposed.unclustered.length > 0 && (
            <div className="rounded-lg p-3" style={{ border: "1px dashed var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text3)" }}>Not included ({proposed.unclustered.length})</p>
              <div className="flex gap-2 flex-wrap">
                {proposed.unclustered.map(u => (
                  <div key={u.photoIndex} className="flex flex-col items-center gap-1" style={{ width: 60 }}>
                    <img src={photos[u.photoIndex]} alt="" className="rounded object-cover opacity-50" style={{ width: 60, height: 60 }} />
                    <span className="text-[9px] text-center" style={{ color: "var(--text3)" }}>{u.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={onRunMeasurement} disabled={measuring}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors self-start"
            style={{ background: accent, color: "#0b0b12", opacity: measuring ? 0.5 : 1 }}>
            {measuring ? "Measuring…" : "Run measurement"}
          </button>
        </Card>
      )}

      {result && result.map(g => {
        const frames = g.plants[0]?.frames;
        if (!frames || frames.length === 0) return null;
        const hasLowConfidence = frames.some(f => f.lowConfidence);
        return (
          <Card key={g.groupId} accent={accent} className="flex flex-col gap-4">
            <p className="text-xs font-semibold" style={{ color: accent }}>Group {g.groupId + 1}</p>
            {hasLowConfidence && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${WARN_COLOR}18`, color: WARN_COLOR, border: `1px solid ${WARN_COLOR}35` }}>
                One or more frames (marked below) found very little green content — check framing or lighting on those photos.
              </p>
            )}
            <GrowthChart frames={frames} accent={accent} projectedPct={projectGrowth(frames, projectionSteps)} />
            <ProjectionControl frames={frames} stepsAhead={projectionSteps} onStepsAheadChange={setProjectionSteps} projectedPct={projectGrowth(frames, projectionSteps)} accent={accent} />
            <FrameThumbnails frames={frames} accent={accent} onImageClick={(src, alt) => setLightbox({ src, alt })} />
            <div className="self-center">
              <ExportCsvButton onClick={() => downloadCsv(`plant-group-${g.groupId + 1}-growth.csv`, growthFramesToRows(frames))} />
            </div>
          </Card>
        );
      })}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {cameraOpen && (
        <CameraCapture overlaySrc={photos[0] ?? null} onCapture={onPhotoCaptured} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}
