/** The single source of truth for analytics event names and error classes.
 *
 * LOGGING_SPEC.md §4: "All event names live in one file, exported as
 * constants, and nothing calls track() with a string literal. Without this,
 * `run_error` becomes `runError` in the third place someone adds it and the
 * dashboard quietly under-counts."
 *
 * The five names marked EXISTS were already being emitted before this file
 * was written and are re-exported here unchanged — renaming them would orphan
 * every row already in the table.
 */

export const EV = {
  // ── Stage 1: arrival ──────────────────────────────────────────────────
  PAGE_VIEW: "page_view",            // EXISTS
  SESSION_START: "session_start",

  // ── Stage 2: exploring ────────────────────────────────────────────────
  SEARCH: "search",
  SEARCH_RESULT_CLICK: "search_result_click",
  NAV_CLICK: "nav_click",
  TOOL_CARD_CLICK: "tool_card_click",
  SCROLL_DEPTH: "scroll_depth",

  // ── Stage 3: learning ─────────────────────────────────────────────────
  GUIDE_OPEN: "guide_open",
  DEMO_START: "demo_start",
  DEMO_COMPLETE: "demo_complete",
  DEMO_ABANDON: "demo_abandon",

  // ── Stage 4: setting up ───────────────────────────────────────────────
  UPLOAD: "upload",
  SAMPLE_LOAD: "sample_load",
  CONFIG_CHANGE: "config_change",
  PASTE_INPUT: "paste_input",

  // ── Stage 5: running ──────────────────────────────────────────────────
  TOOL_OPEN: "tool_open",            // EXISTS
  QUERY_RUN: "query_run",            // EXISTS
  RUN_SUCCESS: "run_success",
  RUN_ERROR: "run_error",
  RUN_RETRY: "run_retry",

  // ── Stage 6: results ──────────────────────────────────────────────────
  RESULT_VIEW: "result_view",
  RESULT_EXPAND: "result_expand",
  CITATION_CLICK: "citation_click",
  EXPORT: "export",
  COPY: "copy",
  DOWNLOAD: "download",
  /** Live in the table before this file existed — kept under its original
   * spelling so existing rows stay countable. */
  SQL_EDITED: "sql_edited",

  // ── Stage 7: failure ──────────────────────────────────────────────────
  ERROR: "error",                    // EXISTS

  // ── Stage 8: leaving ──────────────────────────────────────────────────
  TOOL_CLOSE: "tool_close",          // EXISTS
  SESSION_END: "session_end",
} as const;

export type EventName = (typeof EV)[keyof typeof EV];

/** LOGGING_SPEC.md §3 stage 7. `rate_limited` is its own class deliberately:
 * it is exactly what went unnoticed for a day on 2026-09-05, and it must be
 * one query away. */
export const ERR = {
  RATE_LIMITED: "rate_limited",
  TIMEOUT: "timeout",
  BAD_INPUT: "bad_input",
  BACKEND_5XX: "backend_5xx",
  NETWORK: "network",
  UNKNOWN: "unknown",
} as const;

export type ErrorClass = (typeof ERR)[keyof typeof ERR];

/** Which part of the journey failed — LOGGING_SPEC.md §3 stage 7. */
export const STAGE = {
  UPLOAD: "upload",
  CONFIG: "config",
  RUN: "run",
  RENDER: "render",
} as const;

export type Stage = (typeof STAGE)[keyof typeof STAGE];

/** Map an HTTP status to an error class. Kept next to the constants so the
 * classification has one definition rather than one per call site. */
export function classifyStatus(status: number): ErrorClass {
  if (status === 429) return ERR.RATE_LIMITED;
  if (status === 408 || status === 504) return ERR.TIMEOUT;
  if (status >= 500) return ERR.BACKEND_5XX;
  if (status >= 400) return ERR.BAD_INPUT;
  return ERR.UNKNOWN;
}

/** Map a thrown value to an error class. A fetch that rejects never had a
 * status: it is an abort, a DNS failure, a CORS rejection or a dropped
 * connection, and the browser deliberately tells us almost nothing about
 * which. AbortError is the one we can name. */
export function classifyThrown(err: unknown): ErrorClass {
  const name = (err as { name?: string })?.name ?? "";
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  if (name === "AbortError" || msg.includes("abort")) return ERR.TIMEOUT;
  if (name === "TypeError" || msg.includes("failed to fetch") || msg.includes("networkerror"))
    return ERR.NETWORK;
  return ERR.UNKNOWN;
}
