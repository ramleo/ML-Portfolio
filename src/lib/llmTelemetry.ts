/** O3: per-call LLM telemetry — normalize each provider's token usage, estimate
 * cost, and record one `llm_calls` row per call (success and failure).
 *
 * Why here: the frontend LLM routes each run on the site's server keys, so this
 * is the one place that sees provider + model + tokens + latency + outcome for a
 * call. Writing a row here makes cost and provider health queryable from the
 * analytics dashboard (which already reads llm_calls). run_id is the trace id
 * (O1), so a row joins to the frontend action and, for backend calls, to the
 * Space's own record of the same work.
 *
 * Content-free (LOGGING_SPEC §6): counts, model name, status, latency — never a
 * prompt or a completion. Fire-and-forget; a logging failure never reaches a
 * visitor, and local runs are gated out like every other analytics write.
 */
import { createClient } from "@supabase/supabase-js";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Prices in USD per 1,000,000 tokens. **As of 2026-10-08**, from each provider's
 * public pricing — ESTIMATES for a dashboard, not a bill. Update the date when
 * refreshed. Only two models cost money here; the free-tier providers are 0.
 * Sources: Claude Haiku 4.5 $1.00 / $5.00 (Anthropic pricing, via the claude-api
 * reference). Gemini 2.5 Flash $0.30 / $2.50 (pricepertoken.com). */
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  claude: { in: 1.0, out: 5.0 },   // claude-haiku-4-5 — the only Claude model the routes send
  gemini: { in: 0.3, out: 2.5 },   // gemini-2.5-flash — the only Gemini model the routes send
  // cohere / groq / mistral run on free tiers → 0 (absent = free, see estimateCostUsd)
};

export type Usage = { input: number | null; output: number | null };

/** Pull {input, output} token counts out of a provider's raw JSON response.
 * Each provider reports usage in its own shape; an unknown shape yields nulls. */
export function extractUsage(provider: string, data: unknown): Usage {
  const d = data as Record<string, unknown> | null | undefined;
  const none: Usage = { input: null, output: null };
  if (!d) return none;
  try {
    const p = provider.toLowerCase();
    if (p === "claude") {
      const u = d.usage as Record<string, number> | undefined;
      return { input: u?.input_tokens ?? null, output: u?.output_tokens ?? null };
    }
    if (p === "gemini") {
      const u = d.usageMetadata as Record<string, number> | undefined;
      return { input: u?.promptTokenCount ?? null, output: u?.candidatesTokenCount ?? null };
    }
    if (p === "cohere") {
      const usage = d.usage as Record<string, Record<string, number>> | undefined;
      const u = usage?.tokens ?? usage?.billed_units;
      return { input: u?.input_tokens ?? null, output: u?.output_tokens ?? null };
    }
    // groq, mistral and any other OpenAI-shaped response
    const u = d.usage as Record<string, number> | undefined;
    return { input: u?.prompt_tokens ?? null, output: u?.completion_tokens ?? null };
  } catch {
    return none;
  }
}

/** Estimated cost in USD for a call, or null when tokens are unknown. A provider
 * not in the price table (free tier) is 0, not null — a real, known $0. */
export function estimateCostUsd(provider: string, input: number | null, output: number | null): number | null {
  if (input === null && output === null) return null;
  const rate = PRICE_PER_MTOK[provider.toLowerCase()];
  if (!rate) return 0;
  return ((input ?? 0) * rate.in + (output ?? 0) * rate.out) / 1_000_000;
}

export type LlmCallRecord = {
  tool: string;
  provider: string;
  model?: string | null;
  status: "ok" | "error";
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  latencyMs?: number | null;
  usage?: Usage;
  runId?: string;            // = trace id (O1)
  operation?: string;        // GenAI semconv: chat | text_completion | embedding …
};

/** Record one call. Awaited by callers so the write lands before the serverless
 * response returns, but it never throws into the request. */
export async function recordLlmCall(c: LlmCallRecord): Promise<void> {
  if (!analyticsWritesEnabled()) return;   // local runs are not visitors
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const input = c.usage?.input ?? null;
  const output = c.usage?.output ?? null;
  try {
    const { error } = await createClient(url, key).from("llm_calls").insert({
      service: "vercel",
      tool: c.tool,
      provider: c.provider,
      model: c.model ?? null,
      status: c.status,
      http_status: c.httpStatus ?? null,
      error_code: c.errorCode ?? null,
      error_message: c.errorMessage ? c.errorMessage.slice(0, 400) : null,
      latency_ms: c.latencyMs ?? null,
      run_id: c.runId ?? null,
      input_tokens: input,
      output_tokens: output,
      cost_usd: estimateCostUsd(c.provider, input, output),
      operation: c.operation ?? "chat",
    });
    if (error) console.error("recordLlmCall: insert failed", error.message);
  } catch (err) {
    console.error("recordLlmCall: insert threw", err instanceof Error ? err.message : String(err));
  }
}
