"use client";
import { useEffect } from "react";
import { ML_ANALYTICS_API } from "@/config/urls";

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
    if (!ML_ANALYTICS_API) return;
    const sessionId = getOrCreateSession();
    fetch(`${ML_ANALYTICS_API}/track`, {
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