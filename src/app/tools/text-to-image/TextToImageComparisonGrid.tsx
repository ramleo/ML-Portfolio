"use client";

interface GridImage {
  image: string;
  mimeType: string;
  label?: string;
}

/** Renders the current result: a single full-width image when there's
 * nothing to compare, or a responsive comparison grid (fixed 2 columns, so
 * 2 images sit side by side and more wrap into additional rows) when the
 * last generation produced multiple versions — either from the Variations
 * picker or a chat "compare styles" request. Clicking a non-primary cell
 * promotes it via onSelect (index into the `others` array, matching
 * useTextToImageRunner's selectVariation). */
export default function TextToImageComparisonGrid({
  accent, primary, others, primaryAlt, onSelect,
}: {
  accent: string;
  primary: GridImage;
  others: GridImage[];
  primaryAlt: string;
  onSelect: (index: number) => void;
}) {
  if (others.length === 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:${primary.mimeType};base64,${primary.image}`}
        alt={primaryAlt}
        style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }}
      />
    );
  }

  const cells = [primary, ...others];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
      {cells.map((cell, i) => {
        const isPrimary = i === 0;
        return (
          <div key={i} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { if (!isPrimary) onSelect(i - 1); }}
              style={{
                display: "block", width: "100%", padding: 0, overflow: "hidden", borderRadius: 10,
                border: isPrimary ? `2px solid ${accent}` : "1px solid var(--border2)",
                cursor: isPrimary ? "default" : "pointer",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${cell.mimeType};base64,${cell.image}`}
                alt={cell.label ?? `Result ${i + 1}`}
                style={{ width: "100%", display: "block" }}
              />
            </button>
            <span style={{
              fontSize: "0.7rem", fontWeight: isPrimary ? 600 : 500,
              color: isPrimary ? accent : "var(--text3)", textAlign: "center",
            }}>
              {cell.label ?? `Result ${i + 1}`}{isPrimary ? " · selected" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}