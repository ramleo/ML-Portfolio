"use client";
import { useState } from "react";
import EdaSection from "./EdaSection";
import { Icon } from "./EdaSection";
import { usePlotly } from "./usePlotly";
import { captureAll } from "./edaReportCapture";
import { buildReportHtml } from "./edaReportHtml";
import { printReport } from "./edaPdf";
import type { EdaResult } from "./edaTypes";

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.45rem",
  border: "1px solid var(--border2)", borderRadius: 8, padding: "0.45rem 0.95rem",
  background: "var(--bg-card)", color: "var(--text)", fontSize: "0.82rem",
  fontWeight: 600, cursor: "pointer",
};

export default function EdaReport({ result, filename }: { result: EdaResult; filename: string }) {
  const { status } = usePlotly();
  const [busy, setBusy] = useState<"" | "html" | "pdf">("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");

  const base = filename.replace(/\.csv$/i, "");

  async function build(kind: "html" | "pdf") {
    setBusy(kind);
    setError("");
    setProgress({ done: 0, total: 0 });
    try {
      const shots = await captureAll(result, (done, total) => setProgress({ done, total }));
      const html = buildReportHtml(result, filename, shots);
      if (kind === "html") {
        const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${base}_eda_report.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await printReport(html);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be built.");
    } finally {
      setBusy("");
    }
  }

  const label = busy && progress.total
    ? `Rendering charts ${progress.done} of ${progress.total}…`
    : busy ? "Preparing…" : "";

  return (
    <EdaSection
      id="report"
      testId="eda-report"
      title="Take the report away"
      icon="download"
      note="Every chart is redrawn at print resolution and embedded in the file, so both downloads work offline with nothing else alongside them. The PDF is typeset into pages first, which is why a chart never lands across a page break."
      empty={status === "failed"
        ? "The charting library could not be loaded, so there are no charts to put in a report. Reload the page to try again."
        : undefined}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", alignItems: "center" }}>
        <button data-wt="eda-report-pdf" onClick={() => build("pdf")}
                disabled={Boolean(busy) || status !== "ready"}
                style={{ ...btn, opacity: busy || status !== "ready" ? 0.6 : 1 }}>
          <Icon name="download" /> PDF
        </button>
        <button data-wt="eda-report-html" onClick={() => build("html")}
                disabled={Boolean(busy) || status !== "ready"}
                style={{ ...btn, opacity: busy || status !== "ready" ? 0.6 : 1 }}>
          <Icon name="download" /> HTML
        </button>
        {label && <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{label}</span>}
      </div>

      {busy && progress.total > 0 && (
        <div style={{ marginTop: "0.8rem", height: 4, borderRadius: 9999, background: "var(--border)", overflow: "hidden" }}>
          <div style={{
            width: `${(progress.done / progress.total) * 100}%`, height: "100%",
            background: "#38bdf8", transition: "width 0.2s",
          }} />
        </div>
      )}

      {error && (
        <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "#f87171" }}>{error}</p>
      )}
    </EdaSection>
  );
}
