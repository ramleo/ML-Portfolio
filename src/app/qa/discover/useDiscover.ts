import { useCallback, useRef, useState } from "react";
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
};

type StatusResp = {
  status: string;
  proposals?: Proposal[];
  run_url?: string | null;
  detail?: string | null;
};

const IDLE: DiscoverState = { phase: "idle", proposals: [], runUrl: null, error: null };

export function useDiscover() {
  const [state, setState] = useState<DiscoverState>(IDLE);
  const cancelled = useRef(false);

  const reset = useCallback(() => { cancelled.current = true; setState(IDLE); }, []);

  const discover = useCallback(async (url: string) => {
    const u = url.trim();
    if (!u) return;
    cancelled.current = false;
    setState({ ...IDLE, phase: "queued" });

    let cid: string;
    try {
      const acc = await qaPost<{ correlation_id: string }>(
        "/qa/discover/start", { url: u }, { tool: TOOL_ID },
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
        setState({ phase: "completed", proposals: s.proposals ?? [], runUrl: s.run_url ?? null, error: null });
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
