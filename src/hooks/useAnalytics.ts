"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { noteSessionPage, noteSessionRun, noteSessionTool } from "@/lib/sessionTracking";
import { EV } from "@/lib/logEvents";

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("_ml_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("_ml_session", id);
  }
  return id;
}

const _queryCounters: Record<string, number> = {};

export function incrementQueryCount(toolName: string) {
  _queryCounters[toolName] = (_queryCounters[toolName] ?? 0) + 1;
}

/** Emit a "run" for a client-side tool that makes no backend call, so its runs
 * are counted the way `trackedFetch` counts backend tools (LOGGING_SPEC.md §12,
 * step 1). `meta` carries enumerated facts only — counts, category, algorithm —
 * NEVER the user's typed/pasted/uploaded content (§6 rule 1). */
export function trackToolRun(toolId: string, meta: Record<string, unknown> = {}) {
  incrementQueryCount(toolId);
  track(EV.QUERY_RUN, { meta: { tool: toolId, ...meta } });
}

/** Emit `sample_load` when a user loads a bundled sample/example as input instead
 * of supplying their own (LOGGING_SPEC.md §12 step 5). `meta` is enumerated facts
 * only (which sample), NEVER the sample's content. */
export function trackSampleLoad(toolId: string, meta: Record<string, unknown> = {}) {
  track(EV.SAMPLE_LOAD, { meta: { tool: toolId, ...meta } });
}

/** Emit `feedback` when a user rates an answer (thumbs up/down). Enumerated only —
 * the rating and tool, NEVER the answer or the user's reason. */
export function trackFeedback(toolId: string, rating: "up" | "down", meta: Record<string, unknown> = {}) {
  track(EV.FEEDBACK, { meta: { tool: toolId, rating, ...meta } });
}

/** Last terminal run outcome per tool, this page-load, for `run_retry` detection
 * (LOGGING_SPEC.md §12 step 5). A run event for a tool whose previous run errored
 * means the user re-ran after a failure — derived centrally so no button needs
 * wiring. Content-free. */
const _lastRunOutcome: Record<string, "ok" | "error"> = {};

export function track(type: string, extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  let enrichedMeta: Record<string, unknown> = typeof extra.meta === "object" && extra.meta ? { ...extra.meta as Record<string, unknown> } : {};
  if (type === "page_view") {
    const count = Number(localStorage.getItem("_ml_pv_count") ?? "0");
    // tz: the browser's time zone (e.g. "Asia/Kolkata"), a rough region for
    // the visitors Vercel cannot place from their IP. No IP is involved.
    let tz: string | undefined;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; } catch { /* old browser */ }
    enrichedMeta = { ...enrichedMeta, device: window.innerWidth < 768 ? "mobile" : "desktop", returning: count > 0, tz };
    localStorage.setItem("_ml_pv_count", String(count + 1));
    // §3 stage 1/8 counters. Done here rather than at 61 page_view call sites.
    noteSessionPage(window.location.pathname);
  }
  if (type === EV.RUN_SUCCESS || type === EV.RUN_ERROR) noteSessionRun(enrichedMeta.tool as string | undefined);
  if (typeof enrichedMeta.tool === "string") noteSessionTool(enrichedMeta.tool);
  // run_retry (§12 step 5): a new run for a tool whose previous run errored is a
  // retry. Derived here so both trackedFetch (run_success/error) and trackToolRun
  // (query_run) are covered without touching either. RUN_RETRY isn't a run event,
  // so it can't recurse.
  {
    const runTool = typeof enrichedMeta.tool === "string" ? enrichedMeta.tool : undefined;
    if (runTool && (type === EV.QUERY_RUN || type === EV.RUN_SUCCESS || type === EV.RUN_ERROR)) {
      if (_lastRunOutcome[runTool] === "error") track(EV.RUN_RETRY, { meta: { tool: runTool } });
      _lastRunOutcome[runTool] = type === EV.RUN_ERROR ? "error" : "ok";
    }
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      path: window.location.pathname,
      session_id: getOrCreateSession(),
      referrer: document.referrer,
      ...extra,
      meta: enrichedMeta,
    }),
  }).catch(() => {});
}

export function useAnalytics(type: string, meta?: Record<string, unknown>) {
  useEffect(() => {
    track(type, { meta: meta ?? {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Emit `guide_open` each time a tool's User-Guide modal opens. Call it
 * unconditionally inside the modal component (before any early return), passing
 * the modal's own `open` prop. One call per modal covers that tool.
 * LOGGING_SPEC.md §12 step 2. */
export function useGuideOpenTracking(toolId: string, open: boolean) {
  useEffect(() => {
    if (open) track(EV.GUIDE_OPEN, { meta: { tool: toolId } });
  }, [open, toolId]);
}

/** Emit `scroll_depth` once at each of 25/50/75/100% of page scroll, re-armed on
 * navigation (LOGGING_SPEC.md §12 step 6). Content-free — only the depth bucket.
 * Mounted once globally in AnalyticsTracker. */
export function useScrollDepth() {
  const pathname = usePathname();
  useEffect(() => {
    const fired = new Set<number>();
    const buckets = [25, 50, 75, 100];
    function onScroll() {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      const pct = (el.scrollTop / scrollable) * 100;
      for (const b of buckets) {
        if (pct >= b && !fired.has(b)) {
          fired.add(b);
          track(EV.SCROLL_DEPTH, { meta: { depth: b } });
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
}

/** Emit `paste_input` when a user pastes into a text field on a tool page
 * (LOGGING_SPEC.md §12 step 5). One global listener; the tool is read from the
 * path. NEVER the pasted text — only a coarse length bucket (§6 rule 1). The
 * password tool is excluded entirely (§5b). Mounted once in AnalyticsTracker. */
export function usePasteInput() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.startsWith("/tools/")) return;
    const tool = pathname.split("/")[2] || "unknown";
    if (tool === "password-audit") return; // §5b: password tool stays content-free
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const editable =
        t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable;
      if (!editable) return;
      let len_bucket: string | undefined;
      try {
        const len = e.clipboardData?.getData("text")?.length ?? 0;
        len_bucket =
          len === 0 ? "empty" : len < 100 ? "<100" : len < 1000 ? "<1k"
          : len < 10000 ? "<10k" : ">=10k";
      } catch { /* clipboard not readable */ }
      track(EV.PASTE_INPUT, { meta: { tool, len_bucket } });
    }
    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, [pathname]);
}

/** Emit `error` for uncaught JS errors and unhandled promise rejections, globally
 * (LOGGING_SPEC.md §3 stage 7). Content-free: only the error's class name and source
 * — NEVER the message or stack, which can contain user content or secrets. Mounted
 * once in AnalyticsTracker. This is what makes a page that crashes show up in the
 * log instead of failing silently; run failures are already covered by `run_error`. */
export function useErrorTracking() {
  useEffect(() => {
    let last = 0;
    function emit(source: string, name: string) {
      const now = Date.now();
      if (now - last < 1000) return; // coalesce error storms
      last = now;
      track(EV.ERROR, { meta: { source, name: name || "Error" } });
    }
    function onError(e: ErrorEvent) {
      emit("window", (e.error && (e.error as { name?: string }).name) || "Error");
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason as { name?: string } | undefined;
      emit("promise", (r && r.name) || "UnhandledRejection");
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}

/** Feature-level (per-control) tracking via ONE delegated listener — see
 * ML-Unified/docs/FEATURE_TRACKING_SPEC.md. A control opts in with `data-ev="id"`
 * (or reuses an existing `data-wt` anchor). Emits `feature_use { tool, control,
 * action, value? }`. Content-free (§6): NEVER reads text/textarea values; `value`
 * is logged only for enumerated controls (select option, checkbox/radio state,
 * slider bucket). Mounted once in AnalyticsTracker. */
export function useFeatureCapture() {
  const pathname = usePathname();
  useEffect(() => {
    const toolFromPath = pathname.startsWith("/tools/") ? (pathname.split("/")[2] || "") : "";
    const toolFor = (el: Element | null): string =>
      toolFromPath || el?.closest<HTMLElement>("[data-ev-tool]")?.dataset.evTool || "";
    const emit = (el: Element | null, action: string, value?: string) => {
      const m = el?.closest<HTMLElement>("[data-ev],[data-wt]");
      const control = m ? (m.dataset.ev || m.dataset.wt) : undefined;
      if (!m || !control) return;
      const tool = toolFor(el);
      if (!tool || tool === "password-audit") return; // §5b
      // A click can carry an enumerated choice via data-ev-value (e.g. a button
      // group), keeping the control id stable. Still enumerated, never content.
      const v = value !== undefined ? value : m.dataset.evValue;
      track(EV.FEATURE_USE, { meta: { tool, control, action, ...(v !== undefined ? { value: v } : {}) } });
    };

    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      // Form controls are handled by change/input below — skip to avoid double counts.
      if (el?.closest("input,select,textarea")) return;
      emit(el, "click");
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      let value: string | undefined;
      if (t.tagName === "SELECT") value = (t as HTMLSelectElement).value;
      else if (t.tagName === "INPUT") {
        const inp = t as HTMLInputElement;
        if (inp.type === "checkbox") value = inp.checked ? "on" : "off";
        else if (inp.type === "radio") value = inp.value; // radio values are enumerated options
        else return; // text/number/etc: never log the value (range handled below)
      } else return;
      emit(t, "change", value);
    };
    let sliderTimer: ReturnType<typeof setTimeout> | null = null;
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || t.tagName !== "INPUT" || t.type !== "range") return;
      const min = Number(t.min || 0), max = Number(t.max || 100), val = Number(t.value);
      const pct = max > min ? (val - min) / (max - min) : 0;
      const bucket = pct <= 0.25 ? "q1" : pct <= 0.5 ? "q2" : pct <= 0.75 ? "q3" : "q4";
      if (sliderTimer) clearTimeout(sliderTimer);
      sliderTimer = setTimeout(() => emit(t, "slider", bucket), 400); // fire on settle
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("input", onInput, true);
      if (sliderTimer) clearTimeout(sliderTimer);
    };
  }, [pathname]);
}

export function useToolTracking(toolName: string) {
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = 0;
    const t0 = Date.now();
    track(EV.TOOL_OPEN, { meta: { tool: toolName } });
    return () => {
      track(EV.TOOL_CLOSE, { duration_ms: Date.now() - t0, meta: { tool: toolName, queries_run: countRef.current } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return () => { countRef.current++; };
}