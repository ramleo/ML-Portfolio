"use client";

import { useState } from "react";

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

  const makeBook = async () => {
    setState("working");
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
      await previewer.preview(source.innerHTML, ["/book.css"], target);
      document.body.classList.add("bk-paginated");
      // One frame for the pages to lay out before the print dialog samples them.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      window.print();
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="hb-actions">
      <button onClick={makeBook} disabled={state === "working"} className="hb-btn hb-btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state === "working" ? "Typesetting…" : "Download as PDF"}
      </button>
      <button onClick={downloadMarkdown} className="hb-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download Markdown
      </button>
    </div>
  );
}
