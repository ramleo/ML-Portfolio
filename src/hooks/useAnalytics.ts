"use client";
import { useEffect } from "react";

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("_ml_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("_ml_session", id);
  }
  return id;
}

function track(type: string, extra: Record<string, unknown> = {}) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      path: window.location.pathname,
      session_id: getOrCreateSession(),
      referrer: document.referrer,
      ...extra,
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
  useEffect(() => {
    const t0 = Date.now();
    track("tool_open", { meta: { tool: toolName } });
    return () => {
      track("tool_close", { duration_ms: Date.now() - t0, meta: { tool: toolName } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}