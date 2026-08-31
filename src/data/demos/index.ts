import automl from "./automl.json";
import multimodalRag from "./multimodal-rag.json";
import textToSql from "./text-to-sql.json";

/**
 * A guided demo: what to say, what to point at, and what to actually do.
 *
 * Stored as JSON rather than TypeScript for one reason — scripts/record-demo.mjs
 * reads the very same files from plain Node to drive Playwright and produce the
 * recorded version. One script, two players; a demo can never drift between the
 * live walkthrough and the clip of it.
 */
export type DemoAction = "none" | "click" | "type" | "file" | "scroll";

export interface DemoStep {
  /** Narration. Also shown as the caption, so it has to read as well as it
   *  sounds — nobody wants a subtitle written for a synthesiser. */
  say: string;
  /** A data-wt anchor inside the tool page to spotlight. Anchors, not CSS
   *  selectors: a class name changes the next time someone restyles a panel,
   *  an anchor is there on purpose and shows up in a grep. */
  at?: string;
  act?: DemoAction;
  /** For act: "type". */
  value?: string;
  /** For act: "file" — a path under /public, dropped into the nearest file input. */
  file?: string;
  /** Extra milliseconds to hold after the narration ends, for the tool to
   *  respond to whatever the step just did. */
  settle?: number;
}

export interface Demo {
  toolId: string;
  /** The handbook heading this belongs under, so the launcher can find it. */
  chapter: string;
  route: string;
  title: string;
  blurb: string;
  steps: DemoStep[];
}

export const DEMOS: Demo[] = [automl, textToSql, multimodalRag] as Demo[];

export const demoForChapter = (id: string) => DEMOS.find((d) => d.chapter === id);
