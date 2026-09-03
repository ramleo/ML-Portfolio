import automl from "./automl.json";
import drift from "./drift.json";
import dnsTunneling from "./dns-tunneling-detector.json";
import emailAuthChecker from "./email-auth-checker.json";
import featureEngineering from "./feature-engineering.json";
import featureSelection from "./feature-selection.json";
import ensemble from "./ensemble.json";
import extensionPermissions from "./extension-permission-analyzer.json";
import maliciousPackage from "./malicious-package-scanner.json";
import multimodalRag from "./multimodal-rag.json";
import optuna from "./optuna.json";
import passwordAudit from "./password-audit.json";
import preprocessing from "./preprocessing.json";
import pipelineBuilder from "./pipeline-builder.json";
import pipelineCinema from "./pipeline-cinema.json";
import realtimeAnalytics from "./realtime-analytics.json";
import shap from "./shap.json";
import phishingEmail from "./phishing-email-classifier.json";
import textToSql from "./text-to-sql.json";
import tlsHeaders from "./tls-security-headers-scanner.json";
import yaraFileScanner from "./yara-file-scanner.json";

/**
 * A guided demo: what to say, what to point at, and what to actually do.
 *
 * Stored as JSON rather than TypeScript for one reason — scripts/record-demo.mjs
 * reads the very same files from plain Node to drive Playwright and produce the
 * recorded version. One script, two players; a demo can never drift between the
 * live walkthrough and the clip of it.
 */
export type DemoAction = "none" | "click" | "type" | "select" | "file" | "scroll";

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
  /** Hold this step until an anchor appears — for work whose length cannot be
   *  guessed. Ingesting a PDF takes as long as it takes; a fixed wait is
   *  either a stall or a truncation, never the right number. */
  waitFor?: string;
  /** Give up waiting after this long (default two minutes) and carry on, so a
   *  backend having a bad day cannot wedge the walkthrough. */
  waitMs?: number;
  /** Text that must be on screen once this step is done. The recorder aborts
   *  if it is not — three separate clips shipped narration describing
   *  something that had silently failed, and no amount of care while writing
   *  the script catches a backend having a bad day mid-recording. */
  expect?: string;
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
  /** localStorage keys to set to "1" before the tool loads. Several tools run
   *  their own first-visit tour, and two walkthroughs on one screen is worse
   *  than either alone — this is how a demo says "I am the tour now". */
  suppress?: string[];
  steps: DemoStep[];
}

export const DEMOS: Demo[] = [
  automl,
  textToSql,
  multimodalRag,
  drift,
  dnsTunneling,
  emailAuthChecker,
  ensemble,
  extensionPermissions,
  featureEngineering,
  featureSelection,
  maliciousPackage,
  optuna,
  passwordAudit,
  preprocessing,
  pipelineBuilder,
  pipelineCinema,
  realtimeAnalytics,
  shap,
  phishingEmail,
  tlsHeaders,
  yaraFileScanner,
] as Demo[];

export const demoForChapter = (id: string) => DEMOS.find((d) => d.chapter === id);
