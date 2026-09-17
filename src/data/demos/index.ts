import aiCodeDetector from "./ai-code-detector.json";
import attackSurfaceScanner from "./attack-surface-scanner.json";
import automl from "./automl.json";
import contractInvoiceReconciliation from "./contract-invoice-reconciliation.json";
import depthParallax from "./depth-parallax.json";
import documentIntelligence from "./document-intelligence.json";
import exploratoryDataAnalysis from "./exploratory-data-analysis.json";
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
import promptInjection from "./prompt-injection-playground.json";
import pipelineBuilder from "./pipeline-builder.json";
import pipelineCinema from "./pipeline-cinema.json";
import realtimeAnalytics from "./realtime-analytics.json";
import shap from "./shap.json";
import siemAlertTriage from "./siem-alert-triage.json";
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
export type DemoAction =
  | "none" | "click" | "type" | "select" | "file" | "scroll"
  /** Pointer motion. Depth Parallax is driven entirely by moving and dragging
   *  over a WebGL canvas — a step that clicks it does nothing at all, and a
   *  clip narrating "near objects shift more than far ones" over a still frame
   *  is a video that lies about the tool. */
  | "hover" | "drag" | "range";

export interface DemoStep {
  /** Narration. Also shown as the caption, so it has to read as well as it
   *  sounds — nobody wants a subtitle written for a synthesiser. */
  say: string;
  /** A data-wt anchor inside the tool page to spotlight. Anchors, not CSS
   *  selectors: a class name changes the next time someone restyles a panel,
   *  an anchor is there on purpose and shows up in a grep. */
  at?: string;
  act?: DemoAction;
  /** For act: "type", the text. For act: "range", where to leave the slider
   *  as a 0..1 fraction of its track — not the input's own min/max. */
  value?: string;
  /** For act: "hover" and "drag" — where the sweep starts and ends, as
   *  fractions of the anchor's box. Defaults run left to right through the
   *  middle. */
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  /** How long the pointer motion should take. Long enough to read as motion,
   *  short enough not to outlast the narration. */
  overMs?: number;
  /** For act: "file" — a path under /public, dropped into the nearest file input. */
  file?: string;
  /** A second anchor to include in the spotlight, so the ring encloses both.
   *  For a step that drives a control whose whole point is its effect on
   *  something else: everything outside the ring is dimmed, so spotlighting a
   *  slider on its own darkens the picture the slider is changing. */
  with?: string;
  /** Override when this step's action fires, in milliseconds from the start
   *  of the narration. The default is a third of the way in, capped — long
   *  enough for the sentence to have named what is about to happen. */
  actAfter?: number;
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
  aiCodeDetector,
  attackSurfaceScanner,
  automl,
  textToSql,
  contractInvoiceReconciliation,
  documentIntelligence,
  exploratoryDataAnalysis,
  depthParallax,
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
  siemAlertTriage,
  phishingEmail,
  promptInjection,
  tlsHeaders,
  yaraFileScanner,
] as Demo[];

export const demoForChapter = (id: string) => DEMOS.find((d) => d.chapter === id);
