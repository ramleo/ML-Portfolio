"use client";
import { useEffect, useRef } from "react";

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
    enrichedMeta = { ...enrichedMeta, device: window.innerWidth < 768 ? "mobile" : "desktop", returning: count > 0 };
    localStorage.setItem("_ml_pv_count", String(count + 1));
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

export function useToolTracking(toolName: string) {
  const countRef = useRef(0);
  useEffect(() => {
    countRef.current = 0;
    const t0 = Date.now();
    track("tool_open", { meta: { tool: toolName } });
    return () => {
      track("tool_close", { duration_ms: Date.now() - t0, meta: { tool: toolName, queries_run: countRef.current } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return () => { countRef.current++; };
}