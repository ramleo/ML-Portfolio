import { NextRequest, NextResponse } from "next/server";
import { checkAiToolsRequest, type ChatMessage } from "@/lib/aiToolsLimits";

export const maxDuration = 30;

// Fallback for reasoning models if a provider stops honouring reasoning_format.
// Mirrors the backend's strip_thinking() (routers/rag/mm_caption.py): an
// unterminated block means generation was cut off mid-monologue, so there is no
// answer in there to salvage and the dump must not reach the user.
function stripThinking(text: string | undefined): string | undefined {
  if (!text || !text.includes("<think>")) return text;
  const end = text.indexOf("</think>");
  if (end === -1) return undefined;
  const rest = text.slice(end + "</think>".length).trim();
  return rest || undefined;
}

const OPENAI_COMPAT: Record<string, string> = {
  openai:      "https://api.openai.com/v1",
  groq:        "https://api.groq.com/openai/v1",
  together:    "https://api.together.xyz/v1",
  mistral:     "https://api.mistral.ai/v1",
  perplexity:  "https://api.perplexity.ai",
};

// Per-provider default model — must not fall back to an OpenAI model name
// for non-OpenAI providers (e.g. sending "gpt-4o-mini" to Groq 404s).
const DEFAULT_MODELS: Record<string, string> = {
  openai:      "gpt-4o-mini",
  groq:        "qwen/qwen3.8-27b",
  together:    "meta-llama/Llama-3-70b-chat-hf",
  mistral:     "mistral-small-latest",
  perplexity:  "sonar",
};

function friendlyGeminiError(status: number, body: string, isRetry = false): string {
  try { JSON.parse(body); } catch { /* not JSON, fall through */ }
  if (status === 429) return `Rate limit reached — Gemini free tier allows only a few requests per minute. Wait a moment and try again, or switch to Groq (free, higher limits) in chat settings.`;
  if (status === 503) return isRetry
    ? `Both Gemini models are currently overloaded. Switch to Groq or Claude in chat settings (gear icon).`
    : `Gemini is overloaded. Retrying with gemini-2.0-flash...`;
  if (status === 401 || status === 403) return `Invalid or unauthorized Gemini API key. Check your key in chat settings (gear icon).`;
  try {
    const msg = (JSON.parse(body) as { error?: { message?: string } })?.error?.message;
    if (msg) return `Gemini error: ${msg.slice(0, 120)}`;
  } catch { /* ignore */ }
  return `Gemini ${status} error. Try switching to a different provider in chat settings.`;
}

// Returns the text response, or throws with a descriptive message
async function callGemini(key: string, model: string, system: string, messages: ChatMessage[], jsonMode = false, maxTokens = 800) {
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4, ...(jsonMode ? { responseMimeType: "application/json" } : {}) },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    const status = res.status;
    throw Object.assign(new Error(friendlyGeminiError(status, body)), { status, body });
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
}

async function callOpenAICompat(
  baseUrl: string, key: string, model: string,
  system: string, messages: ChatMessage[],
  jsonMode = false, maxTokens = 800,
  providerLabel = "",
) {
  // Groq's qwen models are reasoning models: without this they return the
  // <think> monologue as the reply and truncate the real answer. Gated on
  // Groq + qwen because it is not a standard OpenAI-compatible field — sending
  // it to OpenAI or Together would 400 the request.
  const isGroqReasoning = baseUrl.includes("api.groq.com") && model.startsWith("qwen");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: isGroqReasoning ? Math.max(maxTokens, 900) : maxTokens,
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...messages],
      ...(isGroqReasoning ? { reasoning_format: "hidden" } : {}),
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      const label = providerLabel ? ` for ${providerLabel}` : "";
      throw new Error(`Invalid or expired API key${label}. Add your own key in the chat settings (gear icon), or update the server environment variable.`);
    }
    if (res.status === 429) throw new Error(`Rate limit reached${providerLabel ? ` (${providerLabel})` : ""}. Wait a moment and try again.`);
    throw new Error(`${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return stripThinking(data.choices?.[0]?.message?.content) ?? "No response.";
}

async function callCohere(key: string, model: string, system: string, messages: ChatMessage[], jsonMode = false, maxTokens = 800) {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: system }, ...messages],
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Invalid or expired Cohere API key. Add your own key in chat settings (gear icon), or update the server environment variable.`);
    }
    if (res.status === 429) throw new Error(`Rate limit reached (Cohere). Wait a moment and try again.`);
    throw new Error(`Cohere ${res.status}: ${errBody.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.message?.content?.[0]?.text ?? "No response.";
}

async function callClaude(key: string, model: string, system: string, messages: ChatMessage[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 800, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "No response.";
}

function resolveKey(provider: string, userKey?: string): string {
  if (userKey?.trim()) return userKey.trim();
  const envMap: Record<string, string | undefined> = {
    gemini:     process.env.GEMINI_API_KEY,
    claude:     process.env.ANTHROPIC_API_KEY,
    openai:     process.env.OPENAI_API_KEY,
    groq:       process.env.GROQ_API_KEY,
    cohere:     process.env.COHERE_API_KEY,
    together:   process.env.TOGETHER_API_KEY,
    mistral:    process.env.MISTRAL_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
  };
  return envMap[provider] ?? "";
}

function buildSystem(toolContext: string | undefined): string {
  const hasData = toolContext && !toolContext.includes("No dataset loaded");
  return `You are an ML assistant embedded in an interactive ML tool (feature engineering, preprocessing, feature selection, AutoML, SHAP, Optuna, or ensemble).

Your job is to help the user make good decisions about their specific dataset and transforms.
${hasData
  ? "The user has uploaded a dataset. Always answer in terms of the SPECIFIC columns and statistics listed in the context below — never give generic advice when column-level information is available."
  : "No dataset has been uploaded yet. Answer conceptually and suggest the user upload a CSV to get column-specific advice."}

Rules:
- Reference the actual column names from the context when answering questions about data.
- Keep answers concise: 3–6 sentences maximum.
- When recommending a transform, say which column(s) it applies to and why (skew, missing %, range, etc.).
- If asked something outside ML/data science, politely redirect.

Current tool context:
${toolContext ?? "No dataset loaded yet."}`;
}

export async function POST(req: NextRequest) {
  // Cohere by default: Gemini is the one billed key, so it is only ever an
  // explicit pick. Every caller in the site names its provider anyway.
  const body = await req.json();
  const { provider = "cohere", model, userKey, baseUrl, toolContext, jsonMode = false } = body;

  const checked = checkAiToolsRequest({ ...body, provider });
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: checked.status });
  const { messages, maxTokens } = checked;

  const key = resolveKey(provider, userKey);
  if (!key && !baseUrl)
    return NextResponse.json({
      error: `No API key for ${provider}. Add your key in the chat settings (gear icon).`,
    }, { status: 401 });

  const system = buildSystem(toolContext);

  try {
    let reply: string;

    // If caller supplied a baseUrl, use it directly (user's own provider — any OpenAI-compat endpoint)
    if (baseUrl) {
      // Only the caller's own key may go to a caller-chosen URL. `key` can be
      // a server env key (resolveKey falls back to it), and sending that as a
      // Bearer token to an arbitrary host hands it to whoever runs the host.
      if (!userKey?.trim()) return NextResponse.json({ error: "API key required when using a custom base URL." }, { status: 401 });
      if (!/^https:\/\//i.test(String(baseUrl))) return NextResponse.json({ error: "Custom base URL must start with https://." }, { status: 400 });
      reply = await callOpenAICompat(baseUrl, key, model ?? "gpt-4o-mini", system, messages, jsonMode, maxTokens, "custom");
    } else if (provider === "gemini") {
      const chosenModel = model ?? "gemini-2.5-flash";
      try {
        reply = await callGemini(key, chosenModel, system, messages, jsonMode, maxTokens);
      } catch (e) {
        // Auto-retry with gemini-3.5-flash on 503 (overload only — not 429 rate limit)
        const status = (e as { status?: number }).status;
        if (status === 503 && chosenModel !== "gemini-2.0-flash") {
          try {
            reply = await callGemini(key, "gemini-2.0-flash", system, messages, jsonMode, maxTokens);
          } catch (e2) {
            // Both models overloaded — show the "both overloaded" message
            const s2 = (e2 as { status?: number; body?: string });
            throw new Error(friendlyGeminiError(s2.status ?? 503, s2.body ?? "", true));
          }
        } else {
          throw e;
        }
      }
    } else if (provider === "claude") {
      reply = await callClaude(key, model ?? "claude-haiku-4-5-20251001", system, messages);
    } else if (provider === "cohere") {
      reply = await callCohere(key, model ?? "command-a-03-2025", system, messages, jsonMode, maxTokens);
    } else {
      const base = OPENAI_COMPAT[provider];
      if (!base) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
      reply = await callOpenAICompat(base, key!, model ?? DEFAULT_MODELS[provider] ?? "gpt-4o-mini", system, messages, jsonMode, maxTokens, provider);
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai-tools]", e);
    const msg = (e as Error).message ?? "Unknown error";
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 502 });
  }
}