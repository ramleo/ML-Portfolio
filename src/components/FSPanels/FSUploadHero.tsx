"use client";

import type { ColInfo, SelectionOpts } from "@/lib/fsAlgorithms";
import DatasetEstimator from "@/components/DatasetEstimator";

const ACCENT = "#a9652d";

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

function TechPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 500, color: ACCENT,
      background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`,
      borderRadius: 6, padding: "2px 10px",
    }}>{label}</span>
  );
}

interface FSUploadHeroProps {
  hasFile: boolean;
  fileName: string;
  rowCount: number;
  cols: ColInfo[];
  numericCols: ColInfo[];
  categoricalCols: ColInfo[];
  opts: SelectionOpts;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
}

export default function FSUploadHero({
  hasFile,
  fileName,
  rowCount,
  cols,
  numericCols,
  categoricalCols,
  opts,
  fileRef,
  onFile,
  onDrop,
}: FSUploadHeroProps) {
  return (
    <>
      {/* Hero */}
      <div className="subtle-card" style={{ ...CARD, ["--acc-glow" as string]: `${ACCENT}14` }}>
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
              Keeping Only What Matters
            </div>
            <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
              Upload a CSV and apply fourteen complementary methods — variance threshold, correlation filter,
              top-K MI scoring, SelectKBest, Kendall tau, chi-squared, RFE, Lasso, Ridge, tree importance,
              forward selection, exhaustive search, PCA, and UMAP — to reduce your feature set.
              Download the result. Everything runs in your browser.
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
            {["Variance", "Pearson r", "MI Score", "RFE", "Lasso", "PCA", "UMAP"].map(l => (
              <TechPill key={l} label={l} />
            ))}
          </div>
        </div>
      </div>

      {/* Upload */}
      <div
        className="subtle-card"
        style={{
          ...CARD, cursor: "pointer", textAlign: "center",
          borderStyle: hasFile ? "solid" : "dashed",
          borderColor: hasFile ? `${ACCENT}33` : "var(--border2)",
          ["--acc-glow" as string]: `${ACCENT}14`,
        }}
        data-wt="fs-upload"
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
      >
        <input
          ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {hasFile ? (
          <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{fileName}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--text3)" }}>
                  {rowCount.toLocaleString()} rows &middot; {cols.length} columns ({numericCols.length} numeric, {categoricalCols.length} categorical)
                </div>
              </div>
            </div>
            <span style={{ fontSize: "0.75rem", color: ACCENT, fontWeight: 500 }}>Click to replace</span>
          </div>
          <DatasetEstimator
            n={rowCount}
            p={numericCols.length}
            tool="fs"
            fsOpts={opts}
          />
          </>
        ) : (
          <div>
            <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem", opacity: 0.25, lineHeight: 1 }}>+</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
              Drop a CSV or click to upload
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
              Any tabular dataset — processed entirely in your browser, never leaves this page
            </div>
          </div>
        )}
      </div>
    </>
  );
}