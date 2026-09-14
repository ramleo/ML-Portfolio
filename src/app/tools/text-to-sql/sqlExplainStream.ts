/** The SSE explanation stream, shared by the two panels that consume it.
 *
 * Extracted when instrumenting these calls pushed QueryResultPanel past its
 * pinned length. The two callers were near-identical copies of the same
 * reader loop; the duplication is why the in-band error case had to be fixed
 * twice, in two places, with the same code.
 */
import { trackedFetch, trackRunStart, trackRunError, newRunId } from "@/lib/trackedFetch";
import { STAGE, ERR } from "@/lib/logEvents";

export const ML_SQL_URL = process.env.NEXT_PUBLIC_ML_SQL_URL ?? "https://wram1708-ml-sql.hf.space";

type Opts = {
  tool: string;
  path?: string;
  body: Record<string, unknown>;
  provider: string;
  onToken: (text: string) => void;
  onError: (message: string) => void;
  onSuggestions?: (questions: string[]) => void;
};

export async function streamSqlExplain(o: Opts): Promise<void> {
  const runId = newRunId();
  trackRunStart(o.tool, runId, { provider: o.provider });
  const resp = await trackedFetch(`${ML_SQL_URL}${o.path ?? "/sql/explain"}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(o.body),
  }, { tool: o.tool, runId, streaming: true, meta: { provider: o.provider } });

  // ml-sql refuses with plain JSON, not a stream (403 origin, 429 rate or
  // daily limit), so read its message instead of parsing it as events.
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({})) as { error?: string };
    o.onError(d.error ?? `Request failed (${resp.status}).`);
    return;
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === "token") o.onToken(ev.text);
        else if (ev.type === "suggestions") o.onSuggestions?.(ev.questions ?? []);
        else if (ev.type === "error") {
          o.onError(String(ev.text ?? ""));
          // The failure arrives INSIDE a 200 stream which then closes
          // cleanly, so the transport records a success unless we say
          // otherwise here.
          trackRunError(o.tool, runId, STAGE.RUN,
            /429|rate limit/i.test(String(ev.text ?? "")) ? ERR.RATE_LIMITED : ERR.UNKNOWN,
            { reason: "in_band_stream_error" });
        }
      } catch { /* skip malformed */ }
    }
  }
}
