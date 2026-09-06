/** Session boundaries — LOGGING_SPEC.md §3 stages 1 and 8.
 *
 * `tool_close` already gives per-tool time. What is missing is the visit: how
 * long, how many pages, how many tools tried, how many runs.
 *
 * Why `visibilitychange` and not `beforeunload`: mobile browsers frequently
 * never fire `beforeunload` at all — the tab is backgrounded and then killed.
 * `visibilitychange` fires when the tab is hidden, which is the last moment
 * anything is guaranteed to run. §10 flagged this as unreliable, and it is:
 * treat session_end as a floor on visit length, not a measurement.
 *
 * Counters live in sessionStorage so they survive client navigation between
 * pages but not a new visit. Every read and write is guarded — private mode
 * and blocked site-data both make these throw rather than return null.
 */
import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

const K = {
  start: "_ml_sess_start",
  pages: "_ml_sess_pages",
  tools: "_ml_sess_tools",
  runs:  "_ml_sess_runs",
  ended: "_ml_sess_ended",
};

const read = (k: string): string | null => {
  try { return sessionStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { sessionStorage.setItem(k, v); } catch { /* private mode — counters just won't persist */ }
};
const bump = (k: string, by = 1) => write(k, String(Number(read(k) ?? "0") + by));

/** Call once per page view. Emits session_start on the first page of a visit. */
export function noteSessionPage(path: string) {
  if (!read(K.start)) {
    write(K.start, String(Date.now()));
    track(EV.SESSION_START, { meta: {
      landing_path: path,
      referrer_host: (() => { try { return new URL(document.referrer).host; } catch { return ""; } })(),
      device: window.innerWidth < 768 ? "mobile" : "desktop",
      lang: navigator.language || "",
    } });
  }
  bump(K.pages);
}

/** Background work is not a tool the visitor "used". Counting the keep-alive
 * ping as a tool made a visitor who opened one page and touched nothing look
 * like they had tried a tool — caught in live testing, tools_used was 1 on a
 * session with no interaction at all. */
const BACKGROUND = new Set(["keepalive", "rag-health", "rag-prepare-jina",
                            "drift-models", "drift-versions", "drift-history",
                            "text-to-sql-schema", "rag-analytics"]);

export function noteSessionTool(tool: string) {
  if (BACKGROUND.has(tool)) return;
  const seen = (read(K.tools) ?? "").split(",").filter(Boolean);
  if (!seen.includes(tool)) write(K.tools, [...seen, tool].join(","));
}

/** Same exclusion as noteSessionTool: a health ping is not a run. */
export function noteSessionRun(tool?: string) {
  if (tool && BACKGROUND.has(tool)) return;
  bump(K.runs);
}

/** Emits session_end once, when the tab is first hidden. Guarded by a flag
 * because a tab can be hidden and shown many times in one visit and we do not
 * want one row per alt-tab. */
export function installSessionEnd() {
  const onHide = () => {
    if (document.visibilityState !== "hidden") return;
    if (read(K.ended)) return;
    write(K.ended, "1");
    const started = Number(read(K.start) ?? "0");
    track(EV.SESSION_END, {
      duration_ms: started ? Date.now() - started : 0,
      meta: {
        pages: Number(read(K.pages) ?? "0"),
        tools_used: (read(K.tools) ?? "").split(",").filter(Boolean).length,
        runs: Number(read(K.runs) ?? "0"),
      },
    });
  };
  document.addEventListener("visibilitychange", onHide);
  return () => document.removeEventListener("visibilitychange", onHide);
}
