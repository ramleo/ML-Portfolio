"use client";

import { SharpenButtons } from "./SharpenControls";
import WatermarkControls from "./WatermarkControls";
import type { CameraMatch, DetectedObject, MoireResult, StegoResult } from "./_types";

const ACCENT = "#a78bfa";
const FACE_COLOR = "#fbbf24";
const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image", video: "Video Frame" };

export type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates" | "plates" | "weapons" | "crowd" | "steganography" | "moire" | "cameraMatch";

type Props = {
  page: number;
  chunkType: string | null | undefined;
  visualAction: VisualAction;
  onVisualAction: (v: VisualAction) => void;
  isImageOrVideoOnly: boolean;
  captionText?: string | null;
  objects?: DetectedObject[] | null;
  faces: DetectedObject[];
  entities?: unknown[] | null;
  piiTypes?: string | null;
  signatures?: DetectedObject[] | null;
  plates: DetectedObject[];
  weapons: DetectedObject[];
  personCount?: number | null;
  tampering?: DetectedObject[] | null;
  duplicates?: unknown[] | null;
  steganography?: StegoResult | null;
  moire?: MoireResult | null;
  cameraMatch?: CameraMatch[] | null;
  canFindSimilar: boolean;
  loadingSimilar: boolean;
  onFindSimilar: () => void;
  canEdit: boolean;
  drawMode: boolean;
  onToggleDraw: () => void;
  sharpening: boolean;
  sharpenedImg: string | null;
  viewSharpened: boolean;
  setViewSharpened: (fn: (v: boolean) => boolean) => void;
  regionMode: boolean;
  setRegionMode: (fn: (v: boolean) => boolean) => void;
  setDrawMode: (v: boolean) => void;
  onSharpenWhole: () => void;
  onCancelSharpen: () => void;
  downloadTarget: string | null;
  onDownload: () => void;
  resultImg: string | null;
  onReset: () => void;
  watermarkImg: string;
  source: string;
  showFaces: boolean;
  setShowFaces: (fn: (v: boolean) => boolean) => void;
  /** Restricted-zone plate enforcement — a user-drawn rectangle checked
   * against detected plates' positions. Button only shown when at least
   * one plate exists, since a zone has nothing to enforce otherwise. */
  zoneMode: boolean;
  onToggleZone: () => void;
  hasZone: boolean;
  onClearZone: () => void;
};

/** Header button row above a citation's image — the "Choose an action…"
 * dropdown plus every always-available edit/detect button (Draw region,
 * Sharpen, Download, Reset, watermark, legacy Detect faces/Find similar for
 * non-image/video citations). Split out of CitationThumbnailPanel.tsx once
 * it neared the project's 400-line cap again after the plates/watermark
 * additions — purely a presentational extraction, parent still owns all
 * the underlying state and hooks. */
export default function CitationToolbar({
  page, chunkType, visualAction, onVisualAction, isImageOrVideoOnly, captionText, objects, faces, entities, piiTypes,
  signatures, plates, weapons, personCount, tampering, duplicates, steganography, moire, cameraMatch, canFindSimilar, loadingSimilar, onFindSimilar, canEdit, drawMode,
  onToggleDraw, sharpening, sharpenedImg, viewSharpened, setViewSharpened, regionMode, setRegionMode, setDrawMode,
  onSharpenWhole, onCancelSharpen, downloadTarget, onDownload, resultImg, onReset, watermarkImg, source, showFaces, setShowFaces,
  zoneMode, onToggleZone, hasZone, onClearZone,
}: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--border)" }}>
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
        Page {page}{chunkType && chunkType in TYPE_LABEL ? ` · ${TYPE_LABEL[chunkType]}` : ""}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {isImageOrVideoOnly ? (
          <select value={visualAction} onChange={e => {
              const v = e.target.value as VisualAction;
              onVisualAction(v);
              if (v === "similar") onFindSimilar();
            }}
            aria-label="Choose a detection or edit action"
            className="text-[9px] rounded border"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", borderRadius: 7, color: ACCENT, padding: "2px 4px" }}>
            <option value="">Choose an action…</option>
            {(captionText || (entities && entities.length > 0) || piiTypes) && (
              <optgroup label="Describe">
                {captionText && <option value="description">Describe (caption + OCR)</option>}
                {entities && entities.length > 0 && <option value="entities">Key facts ({entities.length})</option>}
                {piiTypes && <option value="pii">PII detected</option>}
              </optgroup>
            )}
            {((objects && objects.length > 0) || faces.length > 0 || (signatures && signatures.length > 0) ||
              plates.length > 0 || weapons.length > 0 || (typeof personCount === "number" && personCount > 1)) && (
              <optgroup label="Detect">
                {objects && objects.length > 0 && <option value="objects">Detect objects ({objects.length})</option>}
                {faces.length > 0 && <option value="faces">Detect faces ({faces.length})</option>}
                {signatures && signatures.length > 0 && <option value="signatures">Detect signatures ({signatures.length})</option>}
                {plates.length > 0 && <option value="plates">Detect plates ({plates.length})</option>}
                {weapons.length > 0 && <option value="weapons">Detect weapons ({weapons.length})</option>}
                {typeof personCount === "number" && personCount > 1 && <option value="crowd">Crowd density ({personCount})</option>}
              </optgroup>
            )}
            {((tampering && tampering.length > 0) || (duplicates && duplicates.length > 0) ||
              steganography?.detected || moire?.detected || (cameraMatch && cameraMatch.length > 0)) && (
              <optgroup label="Verify">
                {tampering && tampering.length > 0 && <option value="tampering">Check for tampering ({tampering.length})</option>}
                {duplicates && duplicates.length > 0 && <option value="duplicates">Possible duplicate ({duplicates.length})</option>}
                {steganography?.detected && (
                  <option value="steganography">
                    Possible hidden data ({Math.round(steganography.confidence * 100)}%)
                    {steganography.payloadType ? ` — looks like a ${steganography.payloadType}` : ""}
                  </option>
                )}
                {moire?.detected && <option value="moire">Possible screen/scan pattern ({Math.round(moire.confidence * 100)}%)</option>}
                {cameraMatch && cameraMatch.length > 0 && <option value="cameraMatch">Possible same camera ({cameraMatch.length})</option>}
              </optgroup>
            )}
            {canFindSimilar && (isImageOrVideoOnly || chunkType === "figure" || chunkType === "image") && (
              <option value="similar">Find visually similar</option>
            )}
          </select>
        ) : null}
        {canEdit && (
          <button onClick={onToggleDraw}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
            style={drawMode
              ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
              : { borderColor: `${ACCENT}40`, color: ACCENT }}>
            {drawMode ? "Stop drawing" : "Draw region"}
          </button>
        )}
        {canEdit && (
          <SharpenButtons sharpening={sharpening} sharpenedImg={sharpenedImg} viewSharpened={viewSharpened}
            setViewSharpened={setViewSharpened} regionMode={regionMode} setRegionMode={setRegionMode}
            setDrawMode={setDrawMode} onExitZoneMode={zoneMode ? onToggleZone : undefined}
            onSharpenWhole={onSharpenWhole} onCancel={onCancelSharpen} />
        )}
        {plates.length > 0 && (
          <button onClick={zoneMode ? onToggleZone : hasZone ? onClearZone : onToggleZone}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
            style={zoneMode || hasZone
              ? { borderColor: "#c084fc55", background: "#c084fc22", color: "#c084fc" }
              : { borderColor: "#c084fc40", color: "#c084fc" }}>
            {zoneMode ? "Cancel zone" : hasZone ? "Clear zone" : "Mark restricted zone"}
          </button>
        )}
        {canEdit && downloadTarget && (
          <button onClick={onDownload}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
            style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
            Download
          </button>
        )}
        {canEdit && resultImg && (
          <button onClick={onReset}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
            style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
            Reset
          </button>
        )}
        {canEdit && <WatermarkControls img={watermarkImg} source={source} page={page} />}
        {!isImageOrVideoOnly && (
          <>
            {faces.length > 0 && (
              <button onClick={() => setShowFaces(v => !v)}
                className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
                style={showFaces
                  ? { borderColor: `${FACE_COLOR}55`, background: `${FACE_COLOR}22`, color: FACE_COLOR }
                  : { borderColor: `${FACE_COLOR}40`, color: FACE_COLOR }}>
                {showFaces ? "Hide faces" : `Detect faces (${faces.length})`}
              </button>
            )}
            {canFindSimilar && (chunkType === "figure" || chunkType === "image") && (
              <button onClick={onFindSimilar} disabled={loadingSimilar}
                className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
                style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: loadingSimilar ? 0.5 : 1 }}>
                {loadingSimilar ? "Checking…" : "Find similar figures"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
