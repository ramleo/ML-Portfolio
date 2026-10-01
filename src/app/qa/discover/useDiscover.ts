import { useCallback, useEffect, useRef, useState } from "react";
import { qaPost, qaGet } from "../lib/qaClient";

const TOOL_ID = "qa-discover";
const POLL_MS = 5000;
const MAX_POLLS = 80;

export type Proposal = { title: string; steps: string };
export type DiscoverPhase = "idle" | "queued" | "in_progress" | "completed" | "error";

export type DiscoverState = {
  phase: DiscoverPhase;
  proposals: Proposal[];
  runUrl: string | null;
  error: string | null;
  // Real page context (ARIA snapshot + link map) from the explore run, passed
  // into code generation so locators and URLs are grounded, not guessed.
  pageContext: string | null;
};

type StatusResp = {
  status: string;
  proposals?: Proposal[];
  run_url?: string | null;
  detail?: string | null;
  page_context?: string | null;
};

const IDLE: DiscoverState = { phase: "idle", proposals: [], runUrl: null, error: null, pageContext: null };

// Cache the last completed discovery for this tab, so returning to /qa/discover
// after sending a draft to Run restores the proposals + page context instead of
// forcing another ~1-min explore run.
const CACHE_KEY = "qa_discover_cache";
type DiscoverCache = { url: string; proposals: Proposal[]; pageContext: string | null; runUrl: string | null };

function readCache(): DiscoverCache | null {
  try { const r = sessionStorage.getItem(CACHE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function writeCache(c: DiscoverCache): void {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota / unavailable */ }
}
function clearCache(): void {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* unavailable */ }
}

/** The URL of the last completed discovery (to restore the input field). */
export function readDiscoverCachedUrl(): string | null {
  return readCache()?.url ?? null;
}

export function useDiscover() {
  const [state, setState] = useState<DiscoverState>(IDLE);
  const cancelled = useRef(false);

  // Restore the last completed discovery after mount (client-only, so no SSR
  // hydration mismatch). Skipped once a run is already in flight/complete.
  useEffect(() => {
    const c = readCache();
    if (c && c.proposals?.length) {
      setState((prev) => prev.phase === "idle"
        ? { phase: "completed", proposals: c.proposals, runUrl: c.runUrl ?? null, error: null, pageContext: c.pageContext ?? null }
        : prev);
    }
  }, []);

  const reset = useCallback(() => { cancelled.current = true; clearCache(); setState(IDLE); }, []);

  const discover = useCallback(async (url: string, authorized = false) => {
    const u = url.trim();
    if (!u) return;
    cancelled.current = false;
    setState({ ...IDLE, phase: "queued" });

    let cid: string;
    try {
      const acc = await qaPost<{ correlation_id: string }>(
        "/qa/discover/start", { url: u, authorized }, { tool: TOOL_ID },
      );
      cid = acc?.correlation_id;
      if (!cid) throw new Error("Discovery could not be started.");
    } catch (err) {
      setState({ ...IDLE, phase: "error", error: (err as Error).message || "Could not start discovery." });
      return;
    }

    for (let i = 0; i < MAX_POLLS; i++) {
      if (cancelled.current) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (cancelled.current) return;

      let s: StatusResp;
      try {
        s = await qaGet<StatusResp>(`/qa/discover/status/${cid}`);
      } catch {
        continue;
      }

      if (s.status === "completed") {
        const proposals = s.proposals ?? [];
        const pageContext = s.page_context ?? null;
        const runUrl = s.run_url ?? null;
        setState({ phase: "completed", proposals, runUrl, error: null, pageContext });
        writeCache({ url: u, proposals, pageContext, runUrl });
        return;
      }
      if (s.status === "error") {
        setState({ ...IDLE, phase: "error", runUrl: s.run_url ?? null, error: s.detail || "Discovery failed." });
        return;
      }
      setState((prev) => ({ ...prev, phase: s.status === "in_progress" ? "in_progress" : "queued" }));
    }
    setState((prev) => ({ ...prev, phase: "error", error: "Timed out waiting for discovery." }));
  }, []);

  return { state, discover, reset };
}
