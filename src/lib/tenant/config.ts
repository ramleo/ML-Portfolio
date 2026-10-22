/** Q3 M2 — per-tenant chatbot config: the shape stored in tenants.config and the
 * allowlist of providers/models a tenant bot may use. Shared by the config API and
 * the query path so an owner can't point a bot at an arbitrary provider/model. */

/** Max length of a bot's persona/system prompt. Shared by the UI (counter + maxLength)
 * and the server (sanitizeConfig) so both agree on the cap. */
export const SYSTEM_PROMPT_MAX = 16000;

export interface TenantConfig {
  system_prompt: string;   // bot persona (grounding is always enforced on top)
  provider: string;        // generation provider (allowlisted)
  model: string;           // model within that provider (allowlisted)
  greeting: string;        // first message shown in the widget/test (UI-only)
  web_search: boolean;       // allow a live web search when answering (costs per query)
  autosuggest: boolean;      // show suggestion chips + dropdown in the chat (cheap)
  ghost_completion: boolean; // LLM inline ghost-text completion as you type (costs per pause)
}

/** Free-tier-friendly set the backend already supports. First model = default. */
export const PROVIDERS: { id: string; label: string; models: string[] }[] = [
  { id: "cohere", label: "Cohere", models: ["command-a-03-2025"] },
  { id: "groq", label: "Groq (free)", models: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"] },
  { id: "mistral", label: "Mistral", models: ["mistral-small-latest"] },
  { id: "gemini", label: "Gemini", models: ["gemini-3.6-flash"] },
];

export const DEFAULT_CONFIG: TenantConfig = {
  system_prompt: "",
  provider: "cohere",
  model: "command-a-03-2025",
  greeting: "Hi! Ask me anything about us.",
  web_search: false,
  autosuggest: true,
  ghost_completion: false,
};

/** Coerce an untrusted config object into a valid TenantConfig (allowlist-checked,
 * length-capped). Unknown provider/model fall back to the defaults. */
export function sanitizeConfig(raw: unknown): TenantConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const provider = PROVIDERS.find((p) => p.id === String(r.provider)) ?? PROVIDERS[0];
  const model = provider.models.includes(String(r.model)) ? String(r.model) : provider.models[0];
  const str = (v: unknown, max: number) => (typeof v === "string" ? v : "").slice(0, max);
  return {
    system_prompt: str(r.system_prompt, SYSTEM_PROMPT_MAX).trim(),
    provider: provider.id,
    model,
    greeting: str(r.greeting, 300).trim() || DEFAULT_CONFIG.greeting,
    web_search: r.web_search === true,
    autosuggest: r.autosuggest !== false,     // default on (cheap)
    ghost_completion: r.ghost_completion === true,  // default off (per-pause LLM cost)
  };
}
