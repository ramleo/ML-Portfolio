// Chat primitives (types + pure context-building helpers) shared by
// useRagChat.ts — split out to keep that file under the project's 400-line
// cap. No React/state here, just types and pure functions.

export type ToolChatContext = {
  tool: string;
  summary: string;
  /** Markdown user guide — when set, the assistant answers ONLY from it + website topics */
  guide?: string;
  /** Page-specific suggestion chips shown in the empty chat */
  suggestions?: string[];
  /** Answer ONLY from this session's uploaded document(s) — no KB, no web fallback.
   * For tools whose whole point is Q&A over one specific upload. */
  restrictToUploads?: boolean;
  /** Hosting page's own theme accent (its ACCENT constant) — when set, the
   * chat widget uses this instead of the selected AI provider's color, so
   * the widget matches the page it's embedded in rather than signaling
   * which provider is answering. Falls back to providerConfig.color for
   * any page that doesn't pass one, so this is backward-compatible. */
  accent?: string;
  /** Opt-in only (Text-to-Image today) — when set, a message that reads as
   * an image-generation request (see chatImageIntent.ts's
   * isImageGenerationIntent) is intercepted BEFORE it reaches the normal RAG
   * chat pipeline and routed here instead, so the chat can actually trigger
   * a real generation rather than the underlying LLM inventing a "no image
   * tools" refusal (a real, confusing bug: the LLM has no image-gen tool
   * call available to it and no visibility into the page's own Generate
   * button, so free-form chat about this tool could describe generating an
   * image without ever doing it). Every other tool page's chat is
   * unaffected since this is undefined there.
   *
   * Receives the RAW chat message (not a pre-extracted prompt) — the page
   * is responsible for its own extraction, including tool-specific parsing
   * like "compare anime vs photorealistic style of X" (which needs to know
   * this tool's actual style list, deliberately kept out of this generic
   * file). Returns ok/error/count so the chat can report the real outcome
   * ("2 versions are now showing" vs "the image is now showing"). */
  onGenerateImage?: (rawMessage: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
};

export type Message  = { role: "user" | "assistant"; content: string };
export type RagSource = { source: string; text: string; score: number; display_score: number };
export type Groundedness = { score: number; level: "high" | "medium" | "low"; ungrounded_sentences: string[] };

const SITE_SUMMARY =
  "This website is AIRaML, the ML engineering portfolio of Ramakrishnasai Wuppalapati. " +
  "It hosts interactive AI/ML tools: AutoML model training, EDA, Pipeline Builder, " +
  "Text-to-SQL Agent, Document Intelligence, drift detection, RAG chat, and analytics.";

export function buildToolContext(context: ToolChatContext): string {
  if (!context.guide) {
    return `Tool: ${context.tool}\n${context.summary}`;
  }
  return [
    `You are the help assistant for the "${context.tool}" tool on the AIRaML portfolio website.`,
    `SCOPE RULES (strict): Answer ONLY questions about (a) the ${context.tool} tool — using the user guide below as your source of truth — or (b) this website and its tools in general. ` +
      `If the question is about anything else (general ML theory, coding help, unrelated topics), politely reply that you only help with the ${context.tool} tool and this website, and suggest asking about those instead. Do not answer off-topic questions even partially.`,
    `ABOUT THIS WEBSITE: ${SITE_SUMMARY}`,
    `USER GUIDE for ${context.tool}:\n${context.guide}`,
  ].join("\n\n");
}

// Sanitize history before sending: remove error/no-response turns, then ensure strictly alternating roles.
// Prevents Gemini 400 caused by consecutive model turns when previous responses were errors.
export function sanitizeHistory(msgs: Message[]): Message[] {
  const filtered = msgs.filter(m =>
    !(m.role === "assistant" && (m.content.startsWith("Error:") || m.content === "No response."))
  );
  const result: Message[] = [];
  for (const m of filtered) {
    if (result.length === 0 || result[result.length - 1].role !== m.role) {
      result.push(m);
    }
  }
  return result;
}