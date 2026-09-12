"use client";
import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";
import { DEFAULT_CLEAN, type CategoricalMethod, type CleanConfig, type CleanSummary,
         type EdaResult, type NumericMethod, type OutlierMethod } from "./edaTypes";

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem 1.15rem",
};
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

export default function EdaActions({ result, file }: { result: EdaResult; file: File }) {
  const [advice, setAdvice] = useState("");
  const [servedBy, setServedBy] = useState("");
  const [thinking, setThinking] = useState(false);
  const [adviceError, setAdviceError] = useState("");

  const [cfg, setCfg] = useState<CleanConfig>(DEFAULT_CLEAN);
  const [summary, setSummary] = useState<CleanSummary | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanError, setCleanError] = useState("");

  async function suggest() {
    setThinking(true);
    setAdvice("");
    setServedBy("");
    setAdviceError("");
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/eda/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview: result.overview, columns: result.columns, stats: result.stats,
          correlations: result.correlations, insights: result.insights,
          readiness: result.readiness, narrative: result.narrative,
          low_variance_cols: result.low_variance_cols, provider: "auto",
        }),
      }, { tool: "exploratory-data-analysis-suggest" });

      if (!res.ok || !res.body) {
        setAdviceError(res.status === 429
          ? "The daily budget for AI suggestions is spent. It resets at midnight UTC."
          : `The suggestion service answered ${res.status}.`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let evt: { type: string; text?: string; name?: string; model?: string };
          try { evt = JSON.parse(part.slice(6)); } catch { continue; }
          if (evt.type === "provider") setServedBy(`${evt.name} · ${evt.model}`);
          else if (evt.type === "token") setAdvice((prev) => prev + (evt.text ?? ""));
          else if (evt.type === "error") setAdviceError(evt.text ?? "Something went wrong.");
        }
      }
    } catch {
      setAdviceError("Could not reach the suggestion service.");
    } finally {
      setThinking(false);
    }
  }

  async function clean() {
    setCleaning(true);
    setCleanError("");
    setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("config", JSON.stringify(cfg));
      const res = await trackedFetch(`${ML_UNIFIED_API}/eda/clean`, { method: "POST", body: form },
                                     { tool: "exploratory-data-analysis-clean" });
      if (!res.ok) {
        // Show what the server said. "answered 400" alone would send someone
        // looking at the file rather than at the option they picked.
        const body = await res.text().catch(() => "");
        setCleanError(body.slice(0, 240) || `The cleaner answered ${res.status}.`);
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
      setCleanError("Could not reach the cleaner.");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "1.25rem" }}>
      <div style={card}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.3rem" }}>
          Feature engineering suggestions
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0 0 0.85rem" }}>
          Sends the profile above, never the data itself. Free providers first, and the
          model that actually answered is named below.
        </p>
        <button data-wt="eda-suggest" onClick={suggest} disabled={thinking} style={{ ...btn, opacity: thinking ? 0.6 : 1 }}>
          {thinking ? "Thinking…" : "Suggest features"}
        </button>
        {servedBy && (
          <span style={{ marginLeft: "0.7rem", fontSize: "0.72rem", color: "var(--text3)" }}>
            answered by {servedBy}
          </span>
        )}
        {adviceError && (
          <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "#f87171" }}>{adviceError}</p>
        )}
        {advice && (
          <div style={{ marginTop: "0.9rem", fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text2)", whiteSpace: "pre-wrap" }}>
            {advice}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.3rem" }}>
          Clean and export
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0 0 0.85rem" }}>
          Runs on the file you uploaded and downloads the result. Your original is untouched.
        </p>
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
              {["none", "mean", "median", "mode", "ffill", "bfill", "interpolate", "knn", "drop"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
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
          <button data-wt="eda-clean" onClick={clean} disabled={cleaning} style={{ ...btn, opacity: cleaning ? 0.6 : 1 }}>
            {cleaning ? "Cleaning…" : "Clean and download"}
          </button>
        </div>
        {cleanError && <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "#f87171" }}>{cleanError}</p>}
        {summary && (
          <p style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: "var(--text2)" }}>
            {summary.rows_removed.toLocaleString()} row{summary.rows_removed === 1 ? "" : "s"} removed,{" "}
            {(summary.missing_before - summary.missing_after).toLocaleString()} missing value
            {summary.missing_before - summary.missing_after === 1 ? "" : "s"} filled,{" "}
            {summary.outliers_removed.toLocaleString()} outlier{summary.outliers_removed === 1 ? "" : "s"} handled.
            Downloaded {summary.rows_after.toLocaleString()} × {summary.cols_after}.
          </p>
        )}
      </div>
    </section>
  );
}
