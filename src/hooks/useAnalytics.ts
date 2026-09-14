"use client";
import { useEffect, useRef } from "react";
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