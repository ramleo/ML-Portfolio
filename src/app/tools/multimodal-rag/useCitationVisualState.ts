"use client";

import { useEffect, useState } from "react";
import type { Bbox } from "./_types";

export type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates" | "plates" | "weapons" | "crowd" | "steganography" | "moire" | "cameraMatch";

export type SimilarResult = { source: string; page: number; similarity: number };

/** All of CitationThumbnailPanel's local UI-selection state (which detection
 * overlay is showing, draw/sharpen/zone mode, similar-figures results) —
 * pulled into its own hook so it can be reset in ONE place whenever the
 * viewed citation itself changes (a document switch, or a different page),
 * not just re-rendered with new props for the same citation.
 *
 * Before this hook existed, every one of these was a bare useState with no
 * reset tied to `editKey` (source:page) — confirmed live 2026-08-24: select
 * "Detect objects" on one uploaded image, switch to a different uploaded
 * image, and the dropdown stayed on "Detect objects" and rendered THAT
 * image's own object boxes under the wrong stale action instead of
 * returning to its actual last state. Same root cause would also leak
 * `restrictedZone` (a bbox from a totally different image's coordinate
 * space) and stale `similar`-figures results across documents. */
export function useCitationVisualState(editKey: string) {
  const [similar, setSimilar] = useState<SimilarResult[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarNote, setSimilarNote] = useState<string | null>(null);
  const [showFaces, setShowFaces] = useState(false);
  const [visualAction, setVisualAction] = useState<VisualAction>("");
  // "Draw region" (freehand mask drawing) — stays on across multiple draws
  // WITHIN the same citation, same as detected-box removal already chains;
  // user explicitly toggles off via "Stop drawing" when done.
  const [drawMode, setDrawMode] = useState(false);
  // "Sharpen region" (AI deblur scoped to a drawn box) — mutually exclusive
  // with drawMode (object-removal drawing) within the same citation.
  const [regionMode, setRegionMode] = useState(false);
  // "Mark restricted zone" (plate enforcement) — same mutual-exclusion
  // pattern as drawMode/regionMode. Persists across a re-render of the SAME
  // citation, but is reset below on a genuine citation change, same as
  // everything else in this hook.
  const [zoneMode, setZoneMode] = useState(false);
  const [restrictedZone, setRestrictedZone] = useState<Bbox | null>(null);

  useEffect(() => {
    setSimilar(null);
    setLoadingSimilar(false);
    setSimilarNote(null);
    setShowFaces(false);
    setVisualAction("");
    setDrawMode(false);
    setRegionMode(false);
    setZoneMode(false);
    setRestrictedZone(null);
  }, [editKey]);

  return {
    similar, setSimilar, loadingSimilar, setLoadingSimilar, similarNote, setSimilarNote,
    showFaces, setShowFaces, visualAction, setVisualAction,
    drawMode, setDrawMode, regionMode, setRegionMode, zoneMode, setZoneMode,
    restrictedZone, setRestrictedZone,
  };
}
