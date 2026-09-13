"use client";
import { useState } from "react";
import EdaSection from "./EdaSection";
import { Icon } from "./EdaSection";
import { usePlotly } from "./usePlotly";
import { captureAll } from "./edaReportCapture";
import { buildReportHtml } from "./edaReportHtml";
import { printReport } from "./edaPdf";
import type { ReportTheme } from "./reportTheme";
import type { EdaResult } from "./edaTypes";

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.45rem",
  border: "1px solid var(--border2)", borderRadius: 8, padding: "0.45rem 0.95rem",
  background: "var(--bg-card)", color: "var(--text)", fontSize: "0.82rem",
  fontWeight: 600, cursor: "pointer",
};

export default function EdaReport({ result, filename }: { result: EdaResult; filename: string }) {
  const { status } = usePlotly();
  // Light by default, and deliberately not tied to the site's theme: this is
  // a file that gets printed and emailed, and a browser drops background
  // colours from a print job unless the reader ticks "Background graphics",
  // so a dark report reaches paper as pale text on nothing. Dark is offered
  // because a report read on screen should be allowed to match the screen.
  const [theme, setTheme] = useState<ReportTheme>("light");
  const [busy, setBusy] = useState<"" | "html" | "pdf">("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");

  const base = filename.replace(/\.csv$/i, "");

  async function build(kind: "html" | "pdf") {
    setBusy(kind);
    setError("");
    setProgress({ done: 0, total: 0 });
    try {
      const shots = await captureAll(result, theme, (done, total) => setProgress({ done, total }));
      const html = buildReportHtml(result, filename, shots, theme);
      if (kind === "html") {
        const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${base}_eda_report${theme === "dark" ? "_dark" : ""}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await printReport(html, theme);
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
        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>
            Theme
          </span>
          <select
            data-wt="eda-report-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ReportTheme)}
            disabled={Boolean(busy)}
            style={{
              background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)",
              borderRadius: 7, padding: "0.3rem 0.5rem", fontSize: "0.8rem",
            }}
          >
            <option value="light">Light — for printing</option>
            <option value="dark">Dark — for reading on screen</option>
          </select>
        </label>
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

      {theme === "dark" && (
        <p style={{ marginTop: "0.7rem", fontSize: "0.76rem", color: "var(--text3)", lineHeight: 1.5, maxWidth: "70ch" }}>
          A dark report is for reading on a screen. Browsers leave background
          colours out of a print job unless &ldquo;Background graphics&rdquo; is
          ticked in the print dialog, so printing this one without that gives
          pale text on white paper.
        </p>
      )}

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
