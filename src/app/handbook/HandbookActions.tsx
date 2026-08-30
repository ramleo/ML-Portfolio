"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/** A4 for paper, a small page for a handset — see public/book-phone.css. */
type Edition = "print" | "phone";

/**
 * Taking the handbook away: as Markdown, or as a typeset PDF.
 *
 * The PDF is not the browser printing this web page. A browser paginates after
 * the CSS has finished, so it can tell you nothing about which page a chapter
 * landed on — which rules out the one thing a book's contents page must do.
 * Paged.js lays the document into real page boxes first, so `target-counter`
 * can resolve a folio for every contents entry, `@page` can carry running heads
 * and page numbers, and chapters can be made to start on a fresh page. Printing
 * that gives a PDF that reads as a book.
 *
 * It is loaded on demand rather than on every visit: the library and the
 * pagination pass are only worth their cost to the reader who actually asks for
 * the PDF, and most never will.
 */
export default function HandbookActions({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "working">("idle");
  const [edition, setEdition] = useState<Edition | null>(null);
  const [paginated, setPaginated] = useState(false);

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "airaml-handbook.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const makeBook = async (which: Edition) => {
    setState("working");
    setEdition(which);
    try {
      const source = document.querySelector(".hb-body");
      const target = document.getElementById("bk-pages");
      if (!source || !target) return;
      target.innerHTML = "";
      // The prebuilt bundle, loaded as a plain script. Importing pagedjs
      // through the bundler throws "s.call is not a function" from its own
      // handler registration once Next has processed the ESM build; the UMD
      // build has no such problem. scripts/copy-pagedjs.mjs puts it here at
      // build time so it always matches the installed version.
      if (!window.PagedModule) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "/vendor/paged.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("could not load the typesetter"));
          document.head.appendChild(s);
        });
      }
      const previewer = new window.PagedModule!.Previewer();
      // The phone edition is book.css plus a small override loaded after it,
      // so the two cannot drift: everything except page size and the display
      // sizes that depend on it is stated once.
      const sheets =
        which === "phone" ? ["/book.css", "/book-phone.css"] : ["/book.css"];
      await previewer.preview(source.innerHTML, sheets, target);
      document.body.classList.add("bk-paginated");
      // One frame for the pages to lay out before the print dialog samples them.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      window.print();
      setPaginated(true);
    } finally {
      setState("idle");
    }
  };

  /**
   * Pagination hides the navbar, the footer and this page's own heading, so
   * without a way back the reader is stranded on the typeset pages and has to
   * use the browser's back button. Dropping the class restores the page, and
   * emptying the container means the next PDF is typeset fresh rather than
   * appended to the last one.
   */
  const leaveBook = () => {
    document.body.classList.remove("bk-paginated");
    const target = document.getElementById("bk-pages");
    if (target) target.innerHTML = "";
    setPaginated(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="hb-actions">
      <button onClick={() => makeBook("print")} disabled={state === "working"} className="hb-btn hb-btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state === "working" && edition === "print" ? "Typesetting…" : "PDF for print (A4)"}
      </button>
      <button onClick={() => makeBook("phone")} disabled={state === "working"} className="hb-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M11 18h2" strokeLinecap="round" />
        </svg>
        {state === "working" && edition === "phone" ? "Typesetting…" : "PDF for phone"}
      </button>
      <button onClick={downloadMarkdown} className="hb-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download Markdown
      </button>
      {/* Portalled to <body>: this button's own ancestor, .hb-head, is one of
          the elements the pagination rules hide, so rendering it in place
          would hide it exactly when it is needed. */}
      {paginated &&
        createPortal(
          <button onClick={leaveBook} className="bk-exit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to the handbook
          </button>,
          document.body
        )}
    </div>
  );
}
