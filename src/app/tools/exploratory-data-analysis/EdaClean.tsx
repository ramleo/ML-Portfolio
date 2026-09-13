"use client";
import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";
import EdaSection from "./EdaSection";
import { DEFAULT_CLEAN, type CategoricalMethod, type CleanConfig, type CleanSummary,
         type NumericMethod, type OutlierMethod } from "./edaTypes";

const btn: React.CSSProperties = {
  border: "1px solid var(--border2)", borderRadius: 8, padding: "0.45rem 0.95rem",
  background: "var(--bg-card)", color: "var(--text)", fontSize: "0.82rem",
  fontWeight: 600, cursor: "pointer",
};
const sel: React.CSSProperties = {
  background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 7, padding: "0.3rem 0.5rem", fontSize: "0.8rem",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export default function EdaClean({ file }: { file: File }) {
  const [cfg, setCfg] = useState<CleanConfig>(DEFAULT_CLEAN);
  const [summary, setSummary] = useState<CleanSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function clean() {
    setBusy(true);
    setError("");
    setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("config", JSON.stringify(cfg));
      const res = await trackedFetch(`${ML_UNIFIED_API}/eda/clean`, { method: "POST", body: form },
                                     { tool: "exploratory-data-analysis-clean" });
      if (!res.ok) {
        // What the server said, not "the cleaner failed". A bare failure sends
        // someone looking at their file rather than at the option they picked.
        const body = await res.text().catch(() => "");
        setError(body.slice(0, 240) || `The cleaner answered ${res.status}.`);
        return;
      }
      const data = await res.json();
      setSummary(data.summary);
      const url = URL.createObjectURL(new Blob([data.csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || "cleaned.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not reach the cleaner.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <EdaSection
      id="clean"
      testId="eda-clean-section"
      title="Clean and export"
      icon="broom"
      note="Runs on the file you uploaded and downloads the result. Your original is untouched."
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", alignItems: "end" }}>
        <Field label="Duplicates">
          <select style={sel} value={cfg.dedup ? "yes" : "no"}
                  onChange={(e) => setCfg({ ...cfg, dedup: e.target.value === "yes" })}>
            <option value="yes">Remove</option>
            <option value="no">Keep</option>
          </select>
        </Field>
        <Field label="Missing numbers">
          <select style={sel} value={cfg.imputation.numeric_method}
                  onChange={(e) => setCfg({ ...cfg, imputation: { ...cfg.imputation, numeric_method: e.target.value as NumericMethod } })}>
            {["none", "mean", "median", "mode", "ffill", "bfill", "interpolate", "knn", "drop"]
              .map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Missing text">
          <select style={sel} value={cfg.imputation.cat_method}
                  onChange={(e) => setCfg({ ...cfg, imputation: { ...cfg.imputation, cat_method: e.target.value as CategoricalMethod } })}>
            {["none", "mode", "constant", "drop"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Outliers">
          <select style={sel} value={cfg.outliers.enabled ? cfg.outliers.method : "none"}
                  onChange={(e) => setCfg({
                    ...cfg,
                    outliers: e.target.value === "none"
                      ? { ...cfg.outliers, enabled: false }
                      : { ...cfg.outliers, enabled: true, method: e.target.value as OutlierMethod },
                  })}>
            {["none", "iqr", "zscore", "winsorize"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <button data-wt="eda-clean" onClick={clean} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Cleaning…" : "Clean and download"}
        </button>
      </div>

      {error && <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "#f87171" }}>{error}</p>}
      {summary && (
        <p style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: "var(--text2)" }}>
          {summary.rows_removed.toLocaleString()} row{summary.rows_removed === 1 ? "" : "s"} removed,{" "}
          {(summary.missing_before - summary.missing_after).toLocaleString()} missing value
          {summary.missing_before - summary.missing_after === 1 ? "" : "s"} filled,{" "}
          {summary.outliers_removed.toLocaleString()} outlier{summary.outliers_removed === 1 ? "" : "s"} handled.
          Downloaded {summary.rows_after.toLocaleString()} × {summary.cols_after}.
        </p>
      )}
    </EdaSection>
  );
}
