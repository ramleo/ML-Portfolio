import { useState, useEffect } from "react";
import { STARTER_QUESTIONS } from "./chatbotConfig";

/**
 * Starter-question chips for the homepage chat: per-section STATIC chips instantly,
 * swapped for DYNAMIC KB-derived ones (from /api/chat/suggest, cached server-side)
 * once they arrive. On any failure the static chips stay — nothing breaks.
 */
export function useStarterChips(open: boolean, section: string): string[] {
  const [dynamic, setDynamic] = useState<string[] | null>(null);

  useEffect(() => {
    if (!open || dynamic) return;
    let alive = true;
    fetch("/api/chat/suggest")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && Array.isArray(d?.suggestions) && d.suggestions.length) setDynamic(d.suggestions); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, dynamic]);

  return dynamic && dynamic.length ? dynamic : (STARTER_QUESTIONS[section] ?? STARTER_QUESTIONS.hero);
}
