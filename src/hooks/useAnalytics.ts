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

export function useAnalytics(type: string, meta?: Record<string, unknown>) {
  useEffect(() => {
    const sessionId = getOrCreateSession();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        path: window.location.pathname,
        session_id: sessionId,
        referrer: document.referrer,
        meta: meta ?? {},
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}