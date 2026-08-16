import type { Bbox, DetectedObject } from "./_types";

type Props = {
  list: DetectedObject[];
  color: string;
  labelFor: (o: DetectedObject) => string;
  /** Skipped on tampering boxes — checking for tampering is a verification
   * step, not an edit workflow. */
  allowRemove: boolean;
  canEdit: boolean;
  inpainting: boolean;
  isCovered: (bbox: Bbox) => boolean;
  runInpaint: (bbox: Bbox, mask?: [number, number][] | null) => void;
  /** Plate detections only (for now) — one click runs the existing
   * corroborated region-sharpen+OCR flow (mm_deblur.py's _sharpen_region)
   * scoped to this exact box, instead of making the user manually drag a
   * "Sharpen region…" box around the plate themselves. */
  onReadAction?: (bbox: Bbox) => void;
};

/** Shared box+label overlay renderer — faces/objects/signatures/tampering
 * all draw the identical shape (absolute box + inside-top label pill),
 * differing only in color and label text. Split out of
 * CitationThumbnailPanel.tsx (already at its 400-line cap) once this was
 * a third+ near-identical copy worth factoring. */
export default function DetectionBoxOverlay({ list: fullList, color, labelFor, allowRemove, canEdit, inpainting, isCovered, runInpaint, onReadAction }: Props) {
  // Drop any detection whose box now mostly overlaps an already-removed
  // (white-filled) region — otherwise a sub-detection like "Bicycle wheel"
  // keeps showing a clickable box over blank space after the whole
  // "Bicycle" box that contained it was removed.
  const list = fullList.filter(o => !isCovered(o.bbox));
  return (
    <>
      {list.map((o, i) => {
        // Stack any label whose box is close enough that the two label pills
        // would likely overlap — not just near-identical top-left corners.
        // Several same-type detections (e.g. tampering regions) often sit
        // side-by-side at similar height, not stacked diagonally, so both
        // axes need a wider catch than "basically the same box."
        let stack = 0;
        for (let j = 0; j < i; j++) {
          if (Math.abs(o.bbox[0] - list[j].bbox[0]) < 0.18 && Math.abs(o.bbox[1] - list[j].bbox[1]) < 0.05) stack++;
        }
        const [bx, by, bw, bh] = o.bbox;
        // Pixel-accurate mask (SAM box-prompt refinement, mm_segment.py) draws
        // as an inner SVG polygon LAYERED ON TOP of the rectangle, never
        // instead of it — SAM can return a thin, poorly-shaped sliver for a
        // small region, and dropping the rectangle in that case left nothing
        // visible at all. Mask points are full-image-normalized; converted to
        // percentages local to this div so they line up regardless of size.
        const hasMask = !!o.mask && o.mask.length >= 3;
        return (
          <div key={i} className="absolute pointer-events-none" style={{
            left: `${bx * 100}%`, top: `${by * 100}%`,
            width: `${bw * 100}%`, height: `${bh * 100}%`,
            // A thin region (common for tampering) can render a few px tall,
            // where a 2px top+bottom border fills the box and reads as a
            // solid line, not a box (live-tested) — pixel minimum prevents it.
            minWidth: 28, minHeight: 20,
            borderRadius: 3,
            border: `2px solid ${color}`, background: `${color}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
          }}>
            {hasMask && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon
                  points={o.mask!.map(([mx, my]) => `${((mx - bx) / bw) * 100},${((my - by) / bh) * 100}`).join(" ")}
                  fill={`${color}30`} stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            <span className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ top: 2 + stack * 16, left: 2, background: color, color: "#0b0b12", whiteSpace: "nowrap" }}>
              {labelFor(o)}
            </span>
            {/* Object Remover shortcut — reuses this detection's bbox/mask, no
                separate region-picking UI needed. Floats HALF-outside the
                box's corner (not inset) so it can't collide with the label
                on a narrow box, which used to cut "100%" into "1[x]%". */}
            {canEdit && allowRemove && (
              <button onClick={() => runInpaint(o.bbox, o.mask)} disabled={inpainting}
                className="absolute pointer-events-auto text-[9px] font-bold rounded-full flex items-center justify-center hover:brightness-110"
                style={{ top: -7, right: -7, width: 14, height: 14, background: color, color: "#0b0b12", opacity: inpainting ? 0.5 : 1, boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }}
                title="Remove this region">
                ✕
              </button>
            )}
            {onReadAction && (
              <button onClick={() => onReadAction(o.bbox)}
                className="absolute pointer-events-auto text-[9px] font-bold px-1.5 py-0.5 rounded hover:brightness-110"
                style={{ bottom: -18, left: 2, background: color, color: "#0b0b12", whiteSpace: "nowrap" }}
                title="Sharpen this region and read it back">
                Read plate
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}