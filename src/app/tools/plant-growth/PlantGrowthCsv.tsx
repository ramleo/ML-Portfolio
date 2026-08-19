"use client";

import type { GrowthFrame, PlantComparison } from "./usePlantGrowthRunner";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV download — builds a Blob URL and clicks a throwaway
 * anchor, no backend involved. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function growthFramesToRows(frames: GrowthFrame[], cmPerPixel?: number): (string | number)[][] {
  const header = ["label", "area_fraction", "growth_pct", "leaf_pixel_count", "greenness_index", "leaf_count", "low_confidence"];
  if (cmPerPixel) header.push("area_cm2");
  const rows = frames.map(f => {
    const row: (string | number)[] = [f.label, f.areaFraction, f.growthPct, f.leafPixelCount, f.greennessIndex, f.leafCount, f.lowConfidence ? "yes" : "no"];
    if (cmPerPixel) row.push(Math.round(f.leafPixelCount * cmPerPixel * cmPerPixel * 100) / 100);
    return row;
  });
  return [header, ...rows];
}

export function compareToRows(plants: PlantComparison[], cmPerPixel?: number): (string | number)[][] {
  const header = ["plant", "area_fraction", "relative_pct", "leaf_pixel_count", "greenness_index", "leaf_count", "low_confidence"];
  if (cmPerPixel) header.push("area_cm2");
  const rows = plants.map(p => {
    const row: (string | number)[] = [`Plant ${p.index + 1}`, p.areaFraction, p.relativePct, p.leafPixelCount, p.greennessIndex, p.leafCount, p.lowConfidence ? "yes" : "no"];
    if (cmPerPixel) row.push(Math.round(p.leafPixelCount * cmPerPixel * cmPerPixel * 100) / 100);
    return row;
  });
  return [header, ...rows];
}

export function ExportCsvButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border"
      style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
      {label}
    </button>
  );
}
