"use client";

import { useRef, useState } from "react";
import { usePlantGrowthRunner, MIN_FRAMES, GROWTH_MIN_FRAMES, MAX_FRAMES, type GrowthFrame, type PlantTrack, type PlantComparison } from "./usePlantGrowthRunner";

const ERROR_COLOR = "#f87171";
const WARN_COLOR = "#facc15";

// Card chrome matches ProjectCard.tsx / text-to-image's Card: var(--bg-glass)
// + backdrop blur + var(--border) + a colored 3px accent top bar.
function Card({ accent, children, className }: { accent: string; children: React.ReactNode; className?: string }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "var(--bg-glass)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    }}>
      <div style={{ height: 3, background: accent }} />
      <div className={className} style={{ padding: "1.5rem" }}>
        {children}
      </div>
    </div>
  );
}

type PendingPhoto = { dataUrl: string; label: string };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Hand-rolled SVG growth curve — no charting library in this repo, this
 * mirrors realtime-analytics/AnalyticsCharts.tsx's Sparkline pattern
 * (area+line path from computed points, gradient fill, axis labels). */
function GrowthChart({ frames, accent }: { frames: GrowthFrame[]; accent: string }) {
  const W = 640, H = 200, PL = 40, PR = 12, PT = 26, PB = 24;
  const iW = W - PL - PR, iH = H - PT - PB;
  const values = frames.map(f => f.growthPct);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = frames.map((f, i) => ({
    x: PL + (i / Math.max(frames.length - 1, 1)) * iW,
    y: PT + (1 - (f.growthPct - min) / range) * iH,
    ...f,
  }));
  const zeroY = PT + (1 - (0 - min) / range) * iH;
  const area = `M${pts[0].x},${zeroY} L${pts.map(p => `${p.x},${p.y}`).join(" L")} L${pts[pts.length - 1].x},${zeroY} Z`;
  const line = `M${pts.map(p => `${p.x},${p.y}`).join(" L")}`;
  const gid = "plant-growth-fill";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PL} y1={zeroY} x2={PL + iW} y2={zeroY} stroke="#ffffff1a" strokeWidth="1" strokeDasharray="3,3" />
      <text x={PL - 6} y={zeroY + 3} textAnchor="end" fontSize="9" fill="var(--text3)">0%</text>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.lowConfidence ? 3 : 3.5}
          fill={p.lowConfidence ? WARN_COLOR : accent}
          stroke={p.lowConfidence ? WARN_COLOR : "none"} />
      ))}
      {pts.map((p, i) => {
        const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
        return (
          <text key={`label-${i}`} x={p.x} y={H - 4} textAnchor={anchor} fontSize="8" fill="var(--text3)">
            {p.label.length > 8 ? p.label.slice(0, 7) + "…" : p.label}
          </text>
        );
      })}
      {pts.map((p, i) => {
        const anchor = i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle";
        return (
          <text key={`val-${i}`} x={p.x} y={p.y - 8} textAnchor={anchor} fontSize="9" fontWeight={600} fill="var(--text)">
            {p.growthPct > 0 ? "+" : ""}{p.growthPct}%
          </text>
        );
      })}
    </svg>
  );
}

/** Single photo, multiple plants — ranks them by current leaf area
 * relative to the largest (100%), no time axis. Horizontal bars instead of
 * GrowthChart's line/points since there's no x-axis of days to plot. */
function CompareView({ plants, accent }: { plants: PlantComparison[]; accent: string }) {
  const sorted = [...plants].sort((a, b) => b.relativePct - a.relativePct);
  return (
    <div className="flex flex-col gap-3">
      {sorted.map(p => (
        <div key={p.index} className="flex items-center gap-3">
          {p.maskPreviewUrl && (
            <img src={p.maskPreviewUrl} alt={`Plant ${p.index + 1} leaf mask`} className="rounded-lg object-cover shrink-0"
              style={{ width: 56, height: 56, outline: p.lowConfidence ? `2px solid ${WARN_COLOR}` : "none" }} />
          )}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text3)" }}>Plant {p.index + 1}</span>
              <span className="font-semibold" style={{ color: p.lowConfidence ? WARN_COLOR : accent }}>
                {p.relativePct}%
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: `${p.relativePct}%`, background: p.lowConfidence ? WARN_COLOR : accent }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlantGrowthRunner({ accent }: { accent: string }) {
  const { measuring, result, error, run, reset } = usePlantGrowthRunner();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [autoDetect, setAutoDetect] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(0);

  const onFilesSelected = async (files: FileList) => {
    reset();
    const arr = Array.from(files).slice(0, MAX_FRAMES);
    const dataUrls = await Promise.all(arr.map(readFileAsDataUrl));
    setPending(dataUrls.map((dataUrl, i) => ({ dataUrl, label: `Day ${i}` })));
  };

  const updateLabel = (i: number, label: string) => {
    setPending(p => p.map((photo, idx) => (idx === i ? { ...photo, label } : photo)));
  };

  const removePhoto = (i: number) => {
    setPending(p => p.filter((_, idx) => idx !== i));
  };

  const onMeasure = () => {
    setSelectedPlant(0);
    const payload = pending.map(p => ({ image: p.dataUrl.split(",")[1] ?? "", label: p.label }));
    run(payload, autoDetect);
  };

  const growthPlants: PlantTrack[] | undefined = result?.mode === "growth" ? result.plants : undefined;
  const autoSplitCollage = result?.mode === "growth" && result.autoSplitCollage;
  const activeTrack: PlantTrack | undefined = growthPlants?.[selectedPlant];
  const frames: GrowthFrame[] | undefined = activeTrack?.frames;
  const hasLowConfidence = frames?.some(f => f.lowConfidence) ?? false;

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
            style={{ background: accent, color: "#0b0b12", opacity: measuring ? 0.5 : 1 }}>
            Choose photos
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ""; }} />
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
              </div>
            ))}
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

          <GrowthChart frames={frames} accent={accent} />

          <div className="flex gap-3 flex-wrap justify-center">
            {frames.map((f, i) => (
              <div key={i} className="flex flex-col gap-1 items-center">
                {f.maskPreviewUrl && (
                  <img src={f.maskPreviewUrl} alt={`${f.label} leaf mask`} className="rounded-lg object-cover"
                    style={{ width: 100, height: 100, outline: f.lowConfidence ? `2px solid ${WARN_COLOR}` : "none" }} />
                )}
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>{f.label}</span>
                <span className="text-[10px] font-semibold" style={{ color: f.lowConfidence ? WARN_COLOR : accent }}>
                  {f.growthPct > 0 ? "+" : ""}{f.growthPct}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-center max-w-2xl mx-auto" style={{ color: "var(--text3)" }}>
            Growth is leaf-pixel area relative to the first photo, not a real-world measurement — it only
            holds up if every photo is framed the same way. The green overlay above each thumbnail shows
            exactly what was counted as plant.
          </p>
        </Card>
      )}

      {result?.mode === "compare" && result.plants.length > 0 && (
        <Card accent={accent} className="flex flex-col gap-4">
          {result.plants.some(p => p.lowConfidence) && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${WARN_COLOR}18`, color: WARN_COLOR, border: `1px solid ${WARN_COLOR}35` }}>
              One or more plants (marked below) found very little green content — check that box before trusting its measurement.
            </p>
          )}

          <CompareView plants={result.plants} accent={accent} />

          <p className="text-xs text-center max-w-2xl mx-auto" style={{ color: "var(--text3)" }}>
            Percentages compare these plants&apos; CURRENT leaf area to each other in this one photo — the
            largest plant found is 100%. This is not a growth measurement over time; upload a second photo
            of the same plants instead to chart that.
          </p>
        </Card>
      )}
    </div>
  );
}
