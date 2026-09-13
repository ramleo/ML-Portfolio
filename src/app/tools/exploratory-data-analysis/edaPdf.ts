import { reportCss } from "./edaReportHtml";
import { palette, type ReportTheme } from "./reportTheme";

/**
 * Typesetting the report into real pages, then printing it.
 *
 * Printing the web page directly is not the same thing. A browser paginates
 * after layout, so a chart can be sliced across a page break and a table can
 * lose its header — and this report is mostly charts and tables. Paged.js
 * lays the document into page boxes first, which is where `break-inside:
 * avoid` and running page numbers actually take effect.
 *
 * The bundle is loaded as a plain script on purpose: importing pagedjs
 * through Next's bundler throws "s.call is not a function" from its own
 * handler registration. scripts/copy-pagedjs.mjs puts the prebuilt copy in
 * public/vendor at build time.
 */
const PAGE_CSS = `
@page {
  size: A4;
  margin: 16mm 14mm 18mm;
  @bottom-center { content: counter(page) " / " counter(pages);
    font: 9px ui-sans-serif, sans-serif; color: #94a3b8; }
}
.page { max-width: none; padding: 0; }
h2 { break-after: avoid; }
figure, tr { break-inside: avoid; }
/* On screen a wide table scrolls sideways inside its box. Paper has no
   sideways, so the columns past the page edge are simply gone — the columns
   table lost kurtosis and the readiness verdict that way. Fixed layout makes
   every column share the width instead. */
.scroll { overflow: visible; }
table { table-layout: fixed; width: 100%; font-size: 0.6rem; }
th, td { white-space: normal; overflow-wrap: anywhere; padding: 0.22rem 0.3rem; }
`;

/** The host page while it is showing typeset pages.
 *
 *  The ground has to come from the report's own palette. It was hard-coded
 *  white, which is right for a light report and wrong for a dark one: Paged.js
 *  renders into this document, its page boxes are transparent, and the white
 *  showed straight through — a dark report previewed as its own dark text on
 *  white paper.
 */
function hostCss(theme: ReportTheme): string {
  const c = palette(theme);
  return `
body.eda-printing > *:not(#eda-print-pages):not(.eda-print-exit) { display: none !important; }
body.eda-printing { background: ${c.paper}; overflow: auto; }
body.eda-printing .pagedjs_page { background: ${c.paper}; }
#eda-print-pages:empty { display: none; }
.eda-print-exit { position: fixed; top: 12px; right: 12px; z-index: 9999;
  border: 1px solid ${c.border}; border-radius: 8px; background: ${c.panel}; color: ${c.ink};
  font: 600 0.8rem ui-sans-serif, sans-serif; padding: 0.4rem 0.8rem; cursor: pointer; }
@media print { .eda-print-exit { display: none; } }
`;
}

/** Replaced rather than added once, because the palette changes when the
 *  reader picks a different theme and a stale sheet would keep the old one. */
function ensureHostStyle(theme: ReportTheme) {
  let style = document.getElementById("eda-print-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "eda-print-style";
    document.head.appendChild(style);
  }
  style.textContent = hostCss(theme);
}

async function loadPaged(): Promise<void> {
  if (window.PagedModule) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/paged.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("could not load the typesetter"));
    document.head.appendChild(s);
  });
}

/** Leaves the reader on the typeset pages with no way back otherwise, which
 *  is how the handbook's first version stranded people on a printed view. */
function exitButton(onExit: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "eda-print-exit";
  btn.textContent = "Back to the report";
  btn.onclick = onExit;
  return btn;
}

export async function printReport(html: string, theme: ReportTheme): Promise<void> {
  ensureHostStyle(theme);
  await loadPaged();

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const content = parsed.querySelector(".page");
  if (!content) throw new Error("the report has no body to typeset");

  let target = document.getElementById("eda-print-pages");
  if (!target) {
    target = document.createElement("div");
    target.id = "eda-print-pages";
    document.body.appendChild(target);
  }
  target.innerHTML = "";

  // Paged.js takes either a URL to fetch or a { name: cssText } object, and
  // only the second is usable here: the site's CSP has no `blob:` in
  // connect-src, so handing it a blob URL is silently blocked and nothing is
  // ever typeset. Passing the text keeps the PDF's CSS identical to the CSS
  // the HTML download embeds, rather than a second copy in public/ that
  // drifts from it.
  const sheets = [{ "eda-report.css": reportCss(theme) + PAGE_CSS }];
  const exit = exitButton(() => {
    document.body.classList.remove("eda-printing");
    exit.remove();
    target!.innerHTML = "";
    window.scrollTo({ top: 0 });
  });

  // Visible before pagination, not after. Paged.js measures each element to
  // decide where a page breaks, and an element inside a `display: none`
  // container measures zero — the chunker then produces one empty page and
  // stops. Switching the page over first also lets the reader watch the
  // typesetting happen instead of staring at a frozen button.
  document.body.classList.add("eda-printing");
  document.body.appendChild(exit);
  try {
    const previewer = new window.PagedModule!.Previewer();
    await previewer.preview(content.innerHTML, sheets, target);
  } catch (err) {
    exit.click();
    throw err;
  }
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  window.print();
}
