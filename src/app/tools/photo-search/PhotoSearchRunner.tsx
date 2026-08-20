"use client";

import { useRef } from "react";
import { usePhotoSearch } from "./usePhotoSearch";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

function scoreColor(relative: number): string {
  if (relative >= 0.66) return "#34d399";
  if (relative >= 0.33) return "#fbbf24";
  return "var(--text3)";
}

const DUPLICATE_GROUP_COLORS = ["#f97316", "#a78bfa", "#34d399", "#f472b6", "#38bdf8", "#facc15"];

/** Upload a batch of photos, type what you're looking for in plain
 * language, and get them ranked by how well each one matches — CLIP
 * embeds every photo and the text query, no tagging/captioning step
 * required first. Everything happens in one request; nothing is stored
 * server-side between searches. */
export default function PhotoSearchRunner({ accent }: { accent: string }) {
  const {
    photos, addPhotos, removePhoto, query, setQuery, excludeQuery, setExcludeQuery,
    search, searchByImage, imageQueryFilename,
    searching, results, error, reset, findDuplicates, findingDuplicates, duplicateGroups,
  } = usePhotoSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilesSelected = async (files: FileList) => {
    const arr = Array.from(files);
    const prepared = await Promise.all(arr.map(async file => {
      const dataUrl = await readFileAsDataUrl(file);
      return { filename: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, preview: dataUrl, b64: dataUrl.split(",")[1] ?? "" };
    }));
    addPhotos(prepared);
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  };

  const resultByFilename = new Map((results ?? []).map(r => [r.filename, r.score]));

  const groupIndexByFilename = new Map<string, number>();
  (duplicateGroups ?? []).forEach((group, gi) => group.forEach(f => groupIndexByFilename.set(f, gi)));

  const sortedPhotos = duplicateGroups
    ? [...photos].sort((a, b) => {
        const ga = groupIndexByFilename.get(a.filename) ?? Infinity;
        const gb = groupIndexByFilename.get(b.filename) ?? Infinity;
        return ga - gb;
      })
    : results
    ? [...photos].sort((a, b) => {
        if (a.filename === imageQueryFilename) return -1;
        if (b.filename === imageQueryFilename) return 1;
        return (resultByFilename.get(b.filename) ?? -1) - (resultByFilename.get(a.filename) ?? -1);
      })
    : photos;

  // Raw CLIP cosine similarities sit in a narrow band (typically ~0.15-0.35
  // even for a correct top match) — showing them directly as "% match"
  // would read as a low/broken score despite being the right answer. Scale
  // relative to this batch's own min/max instead, so the badge communicates
  // rank (best match ≈ 100%) rather than an absolute confidence number.
  const scores = results?.map(r => r.score) ?? [];
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 1;
  const relativePct = (score: number) =>
    maxScore === minScore ? 100 : Math.round(((score - minScore) / (maxScore - minScore)) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-4" style={{ color: "var(--text3)" }}>
          Upload a batch of photos, then describe what you&apos;re looking for — &quot;the red backpack&quot;,
          &quot;a dog on a beach&quot;, &quot;a whiteboard with diagrams&quot;. Every photo is embedded with CLIP and
          ranked by how well it matches your description, no manual tagging needed.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12" }}>
            Add photo{"(s)"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) onFilesSelected(e.target.files); e.target.value = ""; }} />
          {photos.length > 0 && (
            <>
              <span className="text-xs" style={{ color: "var(--text3)" }}>{photos.length} photo{photos.length !== 1 ? "s" : ""} added</span>
              <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear all</button>
            </>
          )}
          {photos.length > 1 && (
            <button onClick={findDuplicates} disabled={findingDuplicates}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border ml-auto"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text3)", opacity: findingDuplicates ? 0.5 : 1 }}>
              {findingDuplicates ? "Checking…" : "Find duplicates"}
            </button>
          )}
        </div>

        {photos.length > 0 && (
          <div className="flex flex-col gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") search(); }}
                placeholder="Describe what you're looking for…"
                className="flex-1 text-sm rounded-lg px-3 py-1.5 min-w-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text)" }} />
              <button onClick={search} disabled={!query.trim() || searching}
                className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border shrink-0"
                style={{ borderColor: `${accent}50`, color: accent, opacity: query.trim() && !searching ? 1 : 0.5 }}>
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>excluding (optional):</span>
              <input value={excludeQuery} onChange={e => setExcludeQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") search(); }}
                placeholder="e.g. people, text, screenshots…"
                className="flex-1 text-xs rounded-lg px-3 py-1.5 min-w-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text)" }} />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {imageQueryFilename && (
        <p className="text-xs px-1" style={{ color: accent }}>
          Showing photos similar to the highlighted reference photo below.
        </p>
      )}

      {duplicateGroups && (
        <p className="text-xs px-1" style={{ color: "var(--text3)" }}>
          {duplicateGroups.length === 0
            ? "No likely duplicates found in this batch."
            : `${duplicateGroups.length} possible duplicate group${duplicateGroups.length !== 1 ? "s" : ""} found — grouped and colored below.`}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {sortedPhotos.map(p => {
            const score = resultByFilename.get(p.filename);
            const isReference = p.filename === imageQueryFilename;
            const groupIndex = groupIndexByFilename.get(p.filename);
            const groupColor = groupIndex !== undefined ? DUPLICATE_GROUP_COLORS[groupIndex % DUPLICATE_GROUP_COLORS.length] : null;
            return (
              <div key={p.filename}
                style={{ ...cardStyle, ...(isReference ? { border: `1px solid ${accent}` } : groupColor ? { border: `1px solid ${groupColor}` } : {}) }}
                className="p-2 flex flex-col gap-1.5 relative group">
                <button onClick={() => removePhoto(p.filename)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs z-10"
                  style={{ background: "rgba(0,0,0,0.6)", color: "var(--text3)" }} aria-label="Remove">
                  ×
                </button>
                <img src={p.preview} alt="" className="rounded-lg object-cover w-full" style={{ aspectRatio: "1 / 1" }} />
                {isReference ? (
                  <span className="text-[10px] font-semibold text-center" style={{ color: accent }}>Reference photo</span>
                ) : groupColor ? (
                  <span className="text-[10px] font-semibold text-center" style={{ color: groupColor }}>Possible duplicate</span>
                ) : score !== undefined ? (
                  <span className="text-[10px] font-semibold text-center" style={{ color: scoreColor(relativePct(score) / 100) }}>
                    {relativePct(score)}% match
                  </span>
                ) : null}
                {photos.length > 1 && !isReference && (
                  <button onClick={() => searchByImage(p.filename)}
                    className="text-[9px] px-1.5 py-1 rounded border transition-colors hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text3)" }}>
                    Find similar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {results && (
        <p className="text-[10px] text-center" style={{ color: "var(--text3)" }}>
          Match percentages are relative to each other, not an absolute confidence — CLIP compares meaning,
          not exact objects, so a loose or unusual description may rank imperfectly.
        </p>
      )}
    </div>
  );
}
