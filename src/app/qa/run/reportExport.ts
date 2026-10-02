// Download a finished run report as Excel (.xlsx) or PDF. Pure client-side from the
// in-browser RunState — no server, no persistence. The heavy libs (exceljs, jspdf)
// are dynamically imported so they stay out of the main bundle until a user clicks.
import type { RunState } from "./useRun";

function fmtMs(ms?: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function verdictOf(s: RunState): string {
  if (s.flaky === true) return "Flaky";
  return s.passed === true ? "Passed" : "Failed";
}

/** Safe, readable file stem from the test name. */
function fileStem(name: string): string {
  const base = (name || "testwright-run").trim().replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || "testwright-run").slice(0, 60);
}

/** The label/value rows shared by both exports. */
function metaRows(state: RunState, name: string): [string, string][] {
  const s = state.summary;
  const rows: [string, string][] = [
    ["Test", name || "(unnamed)"],
    ["Result", verdictOf(state)],
    ["Date", new Date().toLocaleString()],
  ];
  if (s) {
    rows.push(["Total", String(s.expected + s.unexpected + s.flaky + s.skipped)]);
    rows.push(["Passed", String(s.expected)]);
    rows.push(["Failed", String(s.unexpected)]);
    if (s.flaky) rows.push(["Flaky", String(s.flaky)]);
    if (s.skipped) rows.push(["Skipped", String(s.skipped)]);
  }
  if (state.testMs != null) rows.push(["Test time", fmtMs(state.testMs)]);
  if (state.totalMs != null) rows.push(["Total time", fmtMs(state.totalMs)]);
  if (state.runs != null && state.runs > 1) {
    rows.push(["Flakiness runs", String(state.runs)]);
    if (state.passRate != null) rows.push(["Pass rate", `${Math.round(state.passRate * 100)}%`]);
  }
  if (state.runUrl) rows.push(["GitHub run", state.runUrl]);
  if (state.passed !== true && state.errorMessage) rows.push(["Why it failed", state.errorMessage]);
  return rows;
}

/** Steps as a table: [#, title, category, duration, ok]. */
function stepRows(state: RunState): (string | number)[][] {
  return state.steps.map((st, i) => [
    i + 1,
    st.title,
    st.category ?? "",
    st.duration != null ? Math.round(st.duration) : "",
    st.ok ? "pass" : "fail",
  ]);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadExcel(state: RunState, name: string): Promise<void> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Testwright";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "k", width: 18 },
    { header: "Value", key: "v", width: 80 },
  ];
  summary.getRow(1).font = { bold: true };
  for (const [k, v] of metaRows(state, name)) summary.addRow({ k, v });

  const steps = wb.addWorksheet("Steps");
  steps.columns = [
    { header: "#", key: "n", width: 5 },
    { header: "Step", key: "t", width: 70 },
    { header: "Category", key: "c", width: 14 },
    { header: "Duration (ms)", key: "d", width: 14 },
    { header: "Result", key: "ok", width: 10 },
  ];
  steps.getRow(1).font = { bold: true };
  for (const r of stepRows(state)) steps.addRow({ n: r[0], t: r[1], c: r[2], d: r[3], ok: r[4] });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileStem(name)}.xlsx`,
  );
}

export async function downloadPdf(state: RunState, name: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Testwright run report", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`${name || "(unnamed)"} — ${verdictOf(state)}`, 14, 26);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 32,
    head: [["Field", "Value"]],
    body: metaRows(state, name),
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
    styles: { fontSize: 9, overflow: "linebreak" },
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" } },
  });

  if (state.steps.length > 0) {
    // autotable stashes the last table's end-Y on the doc (shape varies by version)
    const y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 40) + 8;
    autoTable(doc, {
      startY: y,
      head: [["#", "Step", "Category", "ms", "Result"]],
      body: stepRows(state),
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
      styles: { fontSize: 8, overflow: "linebreak" },
      headStyles: { fillColor: [31, 41, 55] },
      // Fixed widths for the small columns; "Step" (col 1) auto-takes the rest and
      // wraps, so nothing runs off the right edge.
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 24 }, 3: { cellWidth: 14 }, 4: { cellWidth: 16 } },
    });
  }

  doc.save(`${fileStem(name)}.pdf`);
}
