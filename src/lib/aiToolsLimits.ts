/** Request limits for /api/ai-tools (OPEN_ISSUES E11).
 *
 * Without a `userKey` the route spends the site's own keys, so the request may
 * not choose what that costs: the model must be one the site's tools actually
 * use, and output and input sizes are capped. A caller with their own key pays
 * for their own calls and may name any model.
 *
 * The caps sit just above the largest real caller: useAutoMLExplain asks for
 * 3000 output tokens, and its prompt plus the Feature Engineering column
 * summaries stay far below the input limits.
 */

export const MAX_OUTPUT_TOKENS = 3000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 50_000;     // all messages together
const MAX_TOOL_CONTEXT_CHARS = 20_000;

/** Models the site's own tools send. Anything else needs the caller's key. */
const SERVER_KEY_MODELS: Record<string, string[]> = {
  gemini:     ["gemini-2.5-flash"],
  claude:     ["claude-haiku-4-5-20251001"],
  openai:     ["gpt-4o-mini"],
  groq:       ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"],
  cohere:     ["command-a-03-2025"],
  together:   ["meta-llama/Llama-3-70b-chat-hf"],
  mistral:    ["mistral-small-latest"],
  perplexity: ["sonar"],
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Checked =
  | { ok: true; messages: ChatMessage[]; maxTokens: number }
  | { ok: false; status: number; error: string };

export function checkAiToolsRequest(b: {
  messages: unknown; provider: string; model?: unknown; userKey?: unknown;
  toolContext?: unknown; maxTokens?: unknown;
}): Checked {
  if (!Array.isArray(b.messages) || b.messages.length === 0)
    return { ok: false, status: 400, error: "No messages provided." };
  if (b.messages.length > MAX_MESSAGES)
    return { ok: false, status: 400, error: `Too many messages (max ${MAX_MESSAGES}).` };

  // Only user/assistant turns with string content. A caller-sent "system"
  // turn would sit beside the route's own system prompt on OpenAI-style APIs.
  const messages: ChatMessage[] = [];
  let chars = 0;
  for (const m of b.messages as { role?: unknown; content?: unknown }[]) {
    if (typeof m?.content !== "string")
      return { ok: false, status: 400, error: "Each message needs text content." };
    chars += m.content.length;
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  if (chars > MAX_MESSAGE_CHARS)
    return { ok: false, status: 413, error: "Messages are too long." };
  if (b.toolContext !== undefined && String(b.toolContext).length > MAX_TOOL_CONTEXT_CHARS)
    return { ok: false, status: 413, error: "Tool context is too long." };

  const usingServerKey = !(typeof b.userKey === "string" && b.userKey.trim());
  if (usingServerKey && b.model !== undefined && !SERVER_KEY_MODELS[b.provider]?.includes(String(b.model)))
    return { ok: false, status: 400, error: "That model needs your own API key (chat settings, gear icon)." };

  const n = Number(b.maxTokens);
  const maxTokens = Number.isFinite(n) && n >= 1 ? Math.min(Math.trunc(n), MAX_OUTPUT_TOKENS) : 800;
  return { ok: true, messages, maxTokens };
}
