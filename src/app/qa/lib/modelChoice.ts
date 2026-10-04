/**
 * Testwright model selection — free cascade (default) · bring-your-own-key · owner.
 *
 * The backend defaults every request to the free provider cascade. A caller may
 * instead bring their OWN key (BYOK — any provider, their key, used for that one
 * request and never stored on our servers), or, as the portfolio owner, enter the
 * owner token to unlock the server's PAID Gemini key. The choice is stored per
 * browser (localStorage) and merged into generate / assertions / heal requests by
 * `modelFields()`, so it is set once (in Author) and applies across the stages.
 *
 * Keys/tokens live only in this browser's localStorage and are sent to the test
 * service for the request they authorize — they are never persisted server-side.
 */

export type ModelMode = "free" | "byok" | "owner";
export type ByokProvider =
  | "gemini" | "openai" | "claude" | "groq" | "cohere" | "mistral" | "perplexity";

/** BYOK options the picker offers. `defaultModel` is an editable starting point —
 *  the caller can set any model their key supports. */
export const BYOK_PROVIDERS: {
  id: ByokProvider; label: string; defaultModel: string; keyHint: string;
}[] = [
  { id: "gemini",     label: "Google Gemini",   defaultModel: "gemini-3.6-flash",          keyHint: "Google AI Studio API key" },
  { id: "openai",     label: "OpenAI",          defaultModel: "gpt-4o-mini",               keyHint: "OpenAI API key" },
  { id: "claude",     label: "Anthropic Claude",defaultModel: "claude-haiku-4-5-20251001", keyHint: "Anthropic API key" },
  { id: "groq",       label: "Groq",            defaultModel: "llama-3.3-70b-versatile",   keyHint: "Groq API key" },
  { id: "cohere",     label: "Cohere",          defaultModel: "command-a-03-2025",         keyHint: "Cohere API key" },
  { id: "mistral",    label: "Mistral",         defaultModel: "mistral-small-latest",      keyHint: "Mistral API key" },
  { id: "perplexity", label: "Perplexity",      defaultModel: "sonar",                     keyHint: "Perplexity API key" },
];

const OWNER_DEFAULT_MODEL = "gemini-3.6-flash";

export type ModelChoiceState = {
  mode: ModelMode;
  provider: ByokProvider;  // BYOK provider
  model: string;           // BYOK model
  userKey: string;         // BYOK key (this browser only)
  ownerToken: string;      // owner unlock (this browser only)
  ownerModel: string;      // owner Gemini model
};

const KEY = "qa_model_choice";

const DEFAULT: ModelChoiceState = {
  mode: "free",
  provider: "gemini",
  model: "gemini-3.6-flash",
  userKey: "",
  ownerToken: "",
  ownerModel: OWNER_DEFAULT_MODEL,
};

export function loadChoice(): ModelChoiceState {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<ModelChoiceState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveChoice(c: ModelChoiceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* private window / blocked storage — the choice just won't persist */
  }
}

/** The fields to merge into a generate / assertions / heal request body. Returns
 *  {} for the free cascade (so the backend behaves exactly as its default). */
export function modelFields(): Record<string, string> {
  const c = loadChoice();
  if (c.mode === "byok" && c.userKey.trim()) {
    const def = BYOK_PROVIDERS.find((p) => p.id === c.provider)?.defaultModel ?? "";
    return { provider: c.provider, model: c.model.trim() || def, user_key: c.userKey.trim() };
  }
  if (c.mode === "owner" && c.ownerToken.trim()) {
    return {
      provider: "gemini",
      model: c.ownerModel.trim() || OWNER_DEFAULT_MODEL,
      owner_token: c.ownerToken.trim(),
    };
  }
  return {};
}

/** The owner token stored in this browser (set in the Model picker's owner mode),
 *  reused to authorize owner-only actions like R8 monitoring. "" when unset. */
export function ownerToken(): string {
  return loadChoice().ownerToken.trim();
}

/** Short label for the current choice, for an at-a-glance badge. */
export function choiceLabel(c: ModelChoiceState = loadChoice()): string {
  if (c.mode === "byok" && c.userKey.trim()) {
    const p = BYOK_PROVIDERS.find((x) => x.id === c.provider);
    return `Your key · ${p?.label ?? c.provider}`;
  }
  if (c.mode === "owner" && c.ownerToken.trim()) return "Owner · Gemini";
  return "Free (default)";
}
