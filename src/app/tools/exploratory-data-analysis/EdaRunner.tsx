"use client";
import { useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";
import { trackSampleLoad } from "@/hooks/useAnalytics";
import EdaOverview from "./EdaOverview";
import EdaReadiness from "./EdaReadiness";
import EdaStatistics from "./EdaStatistics";
import EdaColumns from "./EdaColumns";
import EdaTables from "./EdaTables";
import EdaDistributions from "./EdaDistributions";
import EdaBoxPlots from "./EdaBoxPlots";
import { CorrelationHeatmap, MiHeatmap } from "./EdaHeatmaps";
import EdaSplom from "./EdaSplom";
import EdaPca from "./EdaPca";
import EdaSuggest from "./EdaSuggest";
import EdaClean from "./EdaClean";
import EdaReport from "./EdaReport";
import EdaSectionNav from "./EdaSectionNav";
import type { EdaResult } from "./edaTypes";

const MAX_BYTES = 10 * 1024 * 1024;

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.15rem 1.25rem",
};

/** A small, deliberately awkward dataset: five rows, a column with two
 *  values, a duplicate row, a constant column. Every one of those shapes
 *  returned HTTP 500 from the standalone service, so the sample doubles as
 *  the regression the page can demonstrate. */
const SAMPLE_CSV = [
  "region,units,price,channel",
  "north,12,4.50,online",
  "south,,4.50,retail",
  "north,12,4.50,online",
  "east,31,4.50,online",
  "west,8,,retail",
].join("\n");

export default function EdaRunner({ onResult }: { onResult: (r: EdaResult | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<EdaResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyze(chosen: File) {
    if (chosen.size > MAX_BYTES) {
      setError("That file is over 10 MB. Trim it, or sample a few thousand rows.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    onResult(null);
    try {
      const form = new FormData();
      form.append("file", chosen);
      const res = await trackedFetch(`${ML_UNIFIED_API}/eda`, { method: "POST", body: form },
                                     { tool: "exploratory-data-analysis", stage: "upload" });
      if (!res.ok) {
        const body = await res.text();
        // Show what the server said. A bare "analysis failed" is how the
        // standalone service's 500 went unnoticed for months.
        setError(body.slice(0, 240) || `The analyzer answered ${res.status}.`);
        return;
      }
      const data: EdaResult = await res.json();
      setResult(data);
      onResult(data);
    } catch {
      setError("Could not reach the analyzer. It may be waking up — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function choose(chosen: File | null) {
    if (!chosen) return;
    setFile(chosen);
    void analyze(chosen);
  }

  function useSample() {
    trackSampleLoad("exploratory-data-analysis");
    const sample = new File([SAMPLE_CSV], "sample-sales.csv", { type: "text/csv" });
    choose(sample);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={card}>
        <p style={{ margin: "0 0 0.9rem", fontSize: "0.9rem", color: "var(--text2)", lineHeight: 1.6, maxWidth: "68ch" }}>
          Upload a CSV. You get an overview, a per-column profile, distributions,
          correlations, and a verdict on whether each column is fit to model on. The
          file is analysed in memory and never stored.
        </p>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a CSV file — click to browse or drop a file here"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0] ?? null); }}
          style={{
            border: `2px dashed ${dragging ? "var(--accent-from)" : "var(--border2)"}`,
            borderRadius: 14, padding: "2rem 1.5rem",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
            cursor: "pointer", textAlign: "center",
            background: dragging ? "color-mix(in srgb, var(--accent-from) 6%, transparent)" : "var(--bg-glass)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent-from)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.95rem" }}>Drop your CSV here</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "0.2rem" }}>or click to browse</div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>Supports any labeled CSV file · max 10 MB</div>
        </div>
        <input
          ref={inputRef}
          data-wt="eda-upload"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", alignItems: "center", marginTop: "0.8rem" }}>
          <button
            data-wt="eda-sample"
            onClick={useSample}
            disabled={busy}
            style={{
              border: "1px solid var(--border2)", borderRadius: 8, padding: "0.4rem 0.9rem",
              background: "none", color: "var(--text2)", fontSize: "0.8rem", cursor: "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Use a sample
          </button>
          {busy && <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>Analysing…</span>}
          {file && !busy && (
            <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>
        {error && (
          <p data-wt="eda-error" style={{ marginTop: "0.9rem", fontSize: "0.85rem", color: "#f87171", lineHeight: 1.55 }}>
            {error}
          </p>
        )}
      </div>

      {result && (
        <>
          {/* The nav is rendered before the sections it points at so it can
              sit above them without a wrapper that would break the sticky. */}
          <EdaSectionNav result={result} />
          <EdaOverview result={result} filename={file?.name ?? "dataset.csv"} />
          <EdaReadiness result={result} />
          <EdaSuggest result={result} />
          <EdaTables result={result} />
          <EdaColumns result={result} />
          <EdaStatistics result={result} />
          <EdaDistributions result={result} />
          <EdaBoxPlots result={result} />
          <MiHeatmap result={result} />
          <EdaSplom result={result} />
          <EdaPca result={result} />
          <CorrelationHeatmap result={result} />
          {file && <EdaClean file={file} />}
          <EdaReport result={result} filename={file?.name ?? "dataset.csv"} />
        </>
      )}
    </div>
  );
}
