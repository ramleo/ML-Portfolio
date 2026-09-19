/**
 * The single network client for the Testwright QA platform.
 *
 * Every /qa/* page calls the backend through this module and nowhere else, so
 * repointing the world at a standalone qa-api microservice is one env var
 * (NEXT_PUBLIC_QA_API_URL) with zero code change. Runs are logged via the
 * shared trackedFetch wrapper, same as every other backend-calling tool.
 */
import { QA_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

export type QaFetchOpts = {
  tool: string;
  timeoutMs?: number;
  meta?: Record<string, unknown>;
};

/** POST JSON to a /qa endpoint, run-logged and time-bounded. Returns parsed JSON. */
export async function qaPost<T>(path: string, body: unknown, opts: QaFetchOpts): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  const runId = newRunId();
  trackRunStart(opts.tool, runId, opts.meta ?? {});
  try {
    const res = await trackedFetch(`${QA_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }, { tool: opts.tool, runId, meta: opts.meta });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail?.[0]?.msg || data?.detail || "Request failed.");
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** GET JSON from a /qa endpoint. Used for status polling — not a "run", so it is
 *  not run-logged, but still goes through QA_API so the microservice seam holds. */
export async function qaGet<T>(path: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${QA_API}${path}`, { signal: controller.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.detail?.[0]?.msg || data?.detail || "Request failed.");
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
