import { NextRequest, NextResponse } from "next/server";
import { clientIp, turnstileOk } from "@/lib/turnstileVerify";

function buildPrompt(stats: unknown, rangeLabel: string): string {
  return `You are a data analyst reviewing a real-time analytics dashboard for an ML portfolio website (ml-portfolio — a portfolio of machine learning tools and demos).

Analyze the following dashboard stats and provide a structured, insightful explanation. Cover:
1. **Traffic Overview** — total events, active users, session quality (bounce rate, duration)
2. **Top Tools & Pages** — what users are actually doing
3. **Conversion** — page_view → tool_open → query_run funnel health
4. **Notable Patterns** — peak hours, top countries, any anomalies
5. **Recommendation** — one concrete action based on the data

Keep it concise (200–280 words). Use bold section headers. Be specific — reference actual numbers from the data.

Period: ${rangeLabel}

Dashboard stats:
${JSON.stringify(stats, null, 2)}`;
}

async function callClaude(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGemini(key: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGroq(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      // llama-3.1-8b-instant was retired by Groq and 404'd here, so this whole
      // branch was dead. qwen is a reasoning model, hence reasoning_format.
      // Verified live 2026-09-07.
      model: "qwen/qwen3.8-27b",
      reasoning_format: "hidden",
      max_tokens: 900,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Same model and v2 reply shape as /api/chat's Cohere call.
async function callCohere(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "command-a-03-2025",
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}`);
  const data = await res.json();
  return data.message?.content?.[0]?.text ?? "";
}

// Same model as /api/ai-tools' Mistral default.
async function callMistral(key: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Real /api/stats payloads are 2–4 KB; 20k leaves room for a busy month
// without letting a caller fill the prompt with whatever they like.
const MAX_STATS_CHARS = 20_000;
const MAX_RANGE_LABEL_CHARS = 60;

export async function POST(req: NextRequest) {
  const { stats, rangeLabel, turnstile_token } = await req.json();

  // This spends the site's keys on a public page, so it needs a real browser:
  // the WAF's 20/min per IP bounds a script, Turnstile stops it (E12).
  if (!(await turnstileOk(turnstile_token, clientIp(req.headers), "ai-explain"))) {
    return NextResponse.json({ error: "Failed verification. Reload the page and try again." }, { status: 403 });
  }

  if (!stats || typeof stats !== "object") return NextResponse.json({ error: "No stats provided" }, { status: 400 });
  if (JSON.stringify(stats).length > MAX_STATS_CHARS) {
    return NextResponse.json({ error: "Stats payload is too large." }, { status: 413 });
  }

  const prompt = buildPrompt(stats, String(rangeLabel ?? "unknown period").slice(0, MAX_RANGE_LABEL_CHARS));

  // Order is the user's decision (2026-09-14, E12): the free providers first,
  // the billed ones last. Providers without a key are skipped; one that fails
  // or answers empty hands over to the next, so Gemini and Claude are only
  // spent when every free provider before them could not answer.
  const chain: [string, string | undefined, (key: string, prompt: string) => Promise<string>][] = [
    ["groq",    process.env.GROQ_API_KEY,      callGroq],
    ["cohere",  process.env.COHERE_API_KEY,    callCohere],
    ["mistral", process.env.MISTRAL_API_KEY,   callMistral],
    ["gemini",  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY, callGemini],
    ["claude",  process.env.ANTHROPIC_API_KEY, callClaude],
  ];
  const configured = chain.filter(([, key]) => key);
  if (configured.length === 0) {
    return NextResponse.json({ error: "No AI provider configured." }, { status: 503 });
  }

  for (const [name, key, call] of configured) {
    try {
      const explanation = (await call(key!, prompt)).trim();
      if (explanation) return NextResponse.json({ explanation, provider: name });
      console.error(`[ai-explain] ${name}: empty reply`);
    } catch (e) {
      // Provider detail stays in the server log, not in the response.
      console.error(`[ai-explain] ${name}:`, e instanceof Error ? e.message : String(e));
    }
  }
  return NextResponse.json({ error: "The AI provider could not answer. Try again in a moment." }, { status: 502 });
}