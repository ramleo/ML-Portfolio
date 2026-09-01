import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import HandbookActions from "./HandbookActions";
import HandbookAudio from "./HandbookAudio";
import HandbookSearch from "./HandbookSearch";
import HandbookRail from "./HandbookRail";
import HandbookReturn from "./HandbookReturn";
import DemoLauncher from "./DemoLauncher";

/**
 * The handbook, rendered from the same public/handbook.md the reader can
 * download. One source, so the page and the file cannot disagree — and the
 * file itself is generated from capabilities.ts by scripts/build-handbook.py,
 * so neither can disagree with the cards.
 *
 * Read at build time rather than fetched in the browser: the content is then
 * in the HTML, which matters for a reference page people will search for and
 * link to.
 */
const title = "Handbook | AIRaML";
const description =
  "Every tool and platform on the site — what each does, what it needs, and where it runs. Readable here, downloadable as Markdown or PDF.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "article" },
};

export default function HandbookPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "public", "handbook.md"),
    "utf8"
  );

  // overflow-x-*clip*, not hidden: `hidden` makes this element a scroll
  // container, and a scroll container stops `position: sticky` working for
  // anything inside it — which silently disabled the search bar. `clip` cuts
  // the same horizontal overflow without creating one.
  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ color: "var(--text)" }}>
      <ParticleGridClient />
      <div className="relative z-10">
        <Navbar />
        <main className="section hb-page">
          <div className="hb-head">
            <div>
              <p className="section-label">Reference</p>
              <h1 className="section-heading" style={{ marginBottom: "0.5rem" }}>
                The <span className="heading-accent">handbook</span>
              </h1>
            </div>
            <HandbookActions markdown={markdown} />
          </div>
          {/* Paged.js renders the typeset pages into this container when the
              reader asks for the PDF; empty until then. */}
          <div id="bk-pages" />
          {/* Find-in-page that can say which chapter a hit is in —
              see handbookIndex.ts. */}
          <HandbookSearch />
          <article className="hb-body">
            {/* remark-gfm, because each tool's facts are a pipe table and plain
                CommonMark has no tables — without it they render as literal
                rows of pipe characters. */}
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {markdown}
            </ReactMarkdown>
          </article>
          {/* Reads the page aloud with the browser's own voice — see
              HandbookAudio.tsx for why this is not a hosted audio file. */}
          <HandbookAudio />
          {/* Adds a "Watch this work" button under the chapters that have a
              guided demo — see src/data/demos. */}
          <DemoLauncher />
          {/* A grabbable stand-in for a scrollbar thumb that is a few pixels
              tall on a page this long — see HandbookRail.tsx. */}
          <HandbookRail />
          {/* The way back from a jump the rail cannot undo — see
              handbookJump.ts. */}
          <HandbookReturn />
        </main>
        <Footer />
      </div>
    </div>
  );
}
