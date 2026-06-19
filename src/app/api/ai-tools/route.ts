import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: string; content: string };

const OPENAI_COMPAT: Record<string, string> = {
  openai:      "https://api.openai.com/v1",
  groq:        "https://api.groq.com/openai/v1",
  together:    "https://api.together.xyz/v1",
  mistral:     "https://api.mistral.ai/v1",
  perplexity:  "https://api.perplexity.ai",
};

async function callOpenAICompat(
  baseUrl: string, key: string, model: string,
  system: string, messages: ChatMessage[]
) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response.";
}

async function callGemini(key: string, model: string, system: string, messages: ChatMessage[]) {
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
        generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
}

async function callClaude(key: string, model: string, system: string, messages: ChatMessage[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 600, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 160)}`);
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

export async function POST(req: NextRequest) {
  const { messages, provider = "gemini", model, userKey, toolContext } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0)
    return NextResponse.json({ reply: "No messages provided." }, { status: 400 });

  const key = resolveKey(provider, userKey);
  if (!key)
    return NextResponse.json({
      reply: `No API key configured for ${provider}. Please add your key in the chat settings (⚙).`,
    });

  const system = `You are an ML assistant embedded in an interactive feature engineering / data preprocessing / ML tool.
Your role is to help the user understand ML concepts, interpret their data, and decide which transforms or operations to apply.
Be concise and practical — 2 to 5 sentences. Use plain language; avoid unnecessary jargon.
When suggesting transforms, briefly explain the trade-off.

Current tool context:
${toolContext ?? "No dataset loaded yet."}`;

  try {
    let reply: string;
    if (provider === "gemini") {
      reply = await callGemini(key, model ?? "gemini-2.5-flash", system, messages);
    } else if (provider === "claude") {
      reply = await callClaude(key, model ?? "claude-haiku-4-5-20251001", system, messages);
    } else {
      const base = OPENAI_COMPAT[provider];
      if (!base) return NextResponse.json({ reply: `Unknown provider: ${provider}` });
      reply = await callOpenAICompat(base, key, model ?? "gpt-4o-mini", system, messages);
    }
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[ai-tools]", e);
    return NextResponse.json({ reply: `Error: ${(e as Error).message.slice(0, 120)}` });
  }
}