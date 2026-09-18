"use client";

import { useRef, useState } from "react";
import { useCrimeSceneReconstruction } from "./useCrimeSceneReconstruction";
import PointCloudViewer from "./PointCloudViewer";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function CrimeSceneReconstructionRunner({ accent }: { accent: string }) {
  const {
    photos, addPhotos, removePhoto,
    calibA, setCalibA, calibB, setCalibB, calibDistanceCm, setCalibDistanceCm,
    reconstruct, running, result, error, reset,
  } = useCrimeSceneReconstruction();
  const inputRef = useRef<HTMLInputElement>(null);
  const [calibrating, setCalibrating] = useState(false);

  const onFilesSelected = async (files: FileList) => {
    const newPhotos = await Promise.all(
      Array.from(files).slice(0, 6 - photos.length).map(async file => {
        const dataUrl = await readFileAsDataUrl(file);
        return { preview: dataUrl, b64: dataUrl.split(",")[1] ?? "" };
      })
    );
    addPhotos(newPhotos);
  };

  const onCalibrationClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!calibrating) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const point = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    if (!calibA) setCalibA(point);
    else if (!calibB) { setCalibB(point); setCalibrating(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Upload 2-6 photos of the same static scene, taken while walking around it">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset */}
              <img src={p.preview} alt={`Photo ${i + 1}`}
                onClick={i === 0 ? onCalibrationClick : undefined}
                className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1", cursor: i === 0 && calibrating ? "crosshair" : undefined }} />
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>{i + 1}</span>
              <button onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                ✕
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button onClick={() => inputRef.current?.click()} data-wt="cs-add"
              className="rounded-lg flex items-center justify-center text-xs font-semibold"
              style={{ aspectRatio: "1 / 1", background: "var(--surface2)", border: "1px dashed var(--border)", color: "var(--text3)" }}>
              + Add photo
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => e.target.files && onFilesSelected(e.target.files)} />

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={reconstruct} disabled={running || photos.length < 2} data-wt="cs-reconstruct"
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Matching features + estimating poses…" : "Reconstruct scene"}
          </button>
          {(photos.length > 0 || result) && (
            <button onClick={reset} disabled={running} className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </Section>

      <Section title="Optional: calibrate to approximate real-world units">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Click two points in photo 1 whose real-world distance you know (e.g. two corners of a table), then enter that distance.
          Without this, the reconstruction is in arbitrary relative units — with it, still only <strong>approximate</strong> (no camera calibration is performed).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => { setCalibrating(true); setCalibA(null); setCalibB(null); }}
            disabled={photos.length === 0 || running}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
            {calibrating ? (calibA ? "Click the second point…" : "Click the first point…") : "Pick two points on photo 1"}
          </button>
          {calibA && calibB && <span className="text-xs" style={{ color: "#22c55e" }}>Two points selected ✓</span>}
          <input type="number" min="0" step="0.1" placeholder="Real-world distance (cm)"
            value={calibDistanceCm} onChange={e => setCalibDistanceCm(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs w-48"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
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
            <Section title="Warnings">
              <ul className="flex flex-col gap-2">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text2)" }}>
                    <span style={{ color: "#f59e0b" }}>⚠</span> {w}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {result.points.length > 0 ? (
            <Section title={`Sparse point cloud (${result.points.length} points, ${result.camera_poses.length} camera positions recovered)${result.scale_applied ? " — approximate real-world scale applied" : " — arbitrary relative units"}`}>
              <div data-wt="cs-cloud">
                <PointCloudViewer points={result.points} cameraPoses={result.camera_poses} accent={accent} />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text3)" }}>Drag to rotate, scroll to zoom. Cones mark recovered camera positions.</p>
            </Section>
          ) : (
            <Section title="No reconstruction">
              <p className="text-sm" style={{ color: "var(--text3)" }}>Not enough matched detail between these photos — see the warning above.</p>
            </Section>
          )}
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" data-wt="cs-limits" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> this is sparse structure-from-motion, not a dense 3D model —
        it reconstructs matched keypoints only. There is no bundle adjustment or loop closure, so pose accuracy degrades with more photos, and no camera
        calibration is performed, so shape and scale are approximate even with the optional distance calibration. This is an educational demonstration
        of the real technique behind photogrammetry/SfM tools like COLMAP, not a forensic-grade measurement tool.
      </div>
    </div>
  );
}
