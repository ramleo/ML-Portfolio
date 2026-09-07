import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  const { stats, rangeLabel } = await req.json();
  if (!stats) return NextResponse.json({ error: "No stats provided" }, { status: 400 });

  const prompt = buildPrompt(stats, rangeLabel ?? "unknown period");

  // Try providers in order — use whichever key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey    = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;

  try {
    let explanation = "";
    if (anthropicKey) {
      explanation = await callClaude(anthropicKey, prompt);
    } else if (geminiKey) {
      explanation = await callGemini(geminiKey, prompt);
    } else if (groqKey) {
      explanation = await callGroq(groqKey, prompt);
    } else {
      return NextResponse.json({ error: "No AI provider configured (set ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY)" }, { status: 503 });
    }
    return NextResponse.json({ explanation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}