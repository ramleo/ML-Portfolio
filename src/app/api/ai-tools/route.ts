import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: string; content: string };

const OPENAI_COMPAT: Record<string, string> = {
  openai:      "https://api.openai.com/v1",
  groq:        "https://api.groq.com/openai/v1",
  together:    "https://api.together.xyz/v1",
  mistral:     "https://api.mistral.ai/v1",
  perplexity:  "https://api.perplexity.ai",
};

function friendlyGeminiError(status: number, body: string, isRetry = false): string {
  try { JSON.parse(body); } catch { /* not JSON, fall through */ }
  if (status === 429) return `Rate limit reached — Gemini free tier allows only a few requests per minute. Wait a moment and try again, or switch to Groq (free, higher limits) in chat settings.`;
  if (status === 503) return isRetry
    ? `Both Gemini models are currently overloaded. Switch to Groq or Claude in chat settings (gear icon).`
    : `Gemini is overloaded. Retrying with gemini-3.5-flash...`;
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
  system: string, messages: ChatMessage[]
) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response.";
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
  const { messages, provider = "gemini", model, userKey, toolContext, jsonMode = false, maxTokens = 800 } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });

  const key = resolveKey(provider, userKey);
  if (!key)
    return NextResponse.json({
      error: `No API key for ${provider}. Add your key in the chat settings (gear icon).`,
    }, { status: 401 });

  const system = buildSystem(toolContext);

  try {
    let reply: string;

    if (provider === "gemini") {
      const chosenModel = model ?? "gemini-2.5-flash";
      try {
        reply = await callGemini(key, chosenModel, system, messages, jsonMode, maxTokens);
      } catch (e) {
        // Auto-retry with gemini-3.5-flash on 503 (overload only — not 429 rate limit)
        const status = (e as { status?: number }).status;
        if (status === 503 && chosenModel !== "gemini-3.5-flash") {
          try {
            reply = await callGemini(key, "gemini-3.5-flash", system, messages, jsonMode, maxTokens);
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
    } else {
      const base = OPENAI_COMPAT[provider];
      if (!base) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
      reply = await callOpenAICompat(base, key, model ?? "gpt-4o-mini", system, messages);
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai-tools]", e);
    const msg = (e as Error).message ?? "Unknown error";
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 502 });
  }
}