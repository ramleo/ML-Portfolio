"use client";

/**
 * The two ways to take the handbook away with you.
 *
 * PDF is the browser's own print-to-PDF rather than a bundled generator. The
 * requirement was that the PDF keep the formatting of the original, and the
 * browser's print engine renders the same DOM with the same CSS, so headings,
 * tables and page breaks come out as designed. The JavaScript alternatives
 * either rasterise the page into a blurry image or re-implement the layout and
 * lose it; both would also add a few hundred KB to every visit for something
 * most readers never use. The print stylesheet in globals does the formatting
 * work — see 09-print.css.
 */
export default function HandbookActions({ markdown }: { markdown: string }) {
  const download = () => {
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

  return (
    <div className="hb-actions">
      <button onClick={() => window.print()} className="hb-btn hb-btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Save as PDF
      </button>
      <button onClick={download} className="hb-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download Markdown
      </button>
    </div>
  );
}
