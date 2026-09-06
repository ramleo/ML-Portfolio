/** Records what people search for — LOGGING_SPEC.md §3 stage 2.
 *
 * The spec calls a zero-result search "the highest-value row on this page…
 * the only record of what someone came for and did not find."
 *
 * Two rules shape this:
 *
 *  - The TEXT is never sent. §6 rule 1 keeps content out of the analytics
 *    table, and a search box is content. What goes is the LENGTH, the number
 *    of results, and whether it found nothing. §10 records a decision to move
 *    to a salted hash later so repeat zero-result searches can be counted
 *    without the words being stored; length alone cannot do that.
 *
 *  - It is debounced. Typing "segmentation" would otherwise emit twelve rows,
 *    eleven of them for prefixes nobody searched for — and the early ones all
 *    look like zero-result searches, which is exactly the number this is
 *    supposed to make trustworthy.
 */
import { useEffect, useRef } from "react";
import { track } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";

const DEBOUNCE_MS = 800;

export function useSearchTracking(surface: string, query: string, resultCount: number) {
  const lastLogged = useRef<string>("");

  useEffect(() => {
    const q = query.trim();
    if (!q) return;                       // clearing the box is not a search
    if (q === lastLogged.current) return; // re-render, not a new query

    const id = setTimeout(() => {
      lastLogged.current = q;
      track(EV.SEARCH, { meta: {
        surface,
        query_len: q.length,
        result_count: resultCount,
        zero_results: resultCount === 0,
      } });
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [surface, query, resultCount]);
}

/** A click on a result — position matters: a result people only ever find at
 * rank 8 is a ranking problem, not a content problem. */
export function trackSearchResultClick(surface: string, position: number, tool: string, queryLen: number) {
  track(EV.SEARCH_RESULT_CLICK, { meta: { surface, position, tool, query_len: queryLen } });
}
