/** Conversation bounds for /api/chat. */

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Every request runs on the site's keys (E13). The widget resends the whole
// conversation each turn, so a long chat is trimmed to its recent part rather
// than refused; only a single oversized message is refused outright.
const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 20_000;

export function boundConversation(raw: unknown): { messages: ChatMessage[] } | { error: string; status: number } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "No messages provided.", status: 400 };
  const all: ChatMessage[] = [];
  for (const m of raw as { role?: unknown; content?: unknown }[]) {
    if (typeof m?.content !== "string") return { error: "Each message needs text content.", status: 400 };
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return { error: `That message is too long — please keep it under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.`, status: 413 };
    }
    // Only user/assistant turns: a caller-sent "system" turn would sit beside
    // the real system prompt on Groq.
    all.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  const kept = all.slice(-MAX_TURNS);
  let total = kept.reduce((n, m) => n + m.content.length, 0);
  while (kept.length > 1 && total > MAX_TOTAL_CHARS) total -= kept.shift()!.content.length;
  // Claude and Gemini expect the conversation to open with the user.
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return { messages: kept };
}

