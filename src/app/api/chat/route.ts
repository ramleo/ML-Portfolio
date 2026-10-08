import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { boundConversation } from '@/lib/chatLimits';
import { isAuthFailure, recordProviderAuthFailure } from '@/lib/providerAlert';
import { traceIdFrom } from '@/lib/trace';
import { extractUsage, recordLlmCall, type Usage } from '@/lib/llmTelemetry';

type LlmResult = { text: string; usage: Usage; model: string };

const SECTION_CONTEXT: Record<string, string> = {
  hero:     "The visitor is on the hero/intro section — overview of who Ramakrishnasai is and what he builds.",
  about:    "The visitor is on the About section. Key facts: PG Diploma in Data Science from IIIT-Bangalore (3.7/4.0 GPA), specialization in Deep Learning. ML Engineer who builds end-to-end production systems, not just notebooks.",
  skills:   "The visitor is exploring the Skills section. Core areas: Machine Learning (XGBoost, SHAP, LIME, GridSearch), Deep Learning (CNN, RNN, LSTM, Transfer Learning with VGG/ResNet/MobileNet), Generative AI (RAG, AI Agents, LangChain, LangGraph, Prompt Engineering), NLP (Word2Vec, Topic Modeling, Sentiment Analysis), Computer Vision (Object Detection, Semantic Segmentation, ONNX, TinyYOLOv3), MLOps (Python, FastAPI, Docker, GCP, Render, MLFlow, Scikit-learn, Pandas, Plotly).",
  projects: "The visitor is browsing the Projects section — live interactive ML apps: Iris species classifier, insurance cost predictor (regression), Titanic survival predictor, diabetes risk classifier. All deployed and running.",
  pipeline: "The visitor is exploring the ML Pipeline visualization — an interactive 8-stage pipeline: Data Ingestion → EDA → Feature Engineering → Model Training → Evaluation → SHAP/Explainability → Model Registry → API Deployment. Each stage is clickable with detail.",
  news:     "The visitor is on the AI/ML News section showing curated live news from the AI industry.",
  timeline: "The visitor is viewing the professional Timeline showing career history and education milestones.",
  contact:  "The visitor is on the Contact section. They can reach out via LinkedIn (WRamakrishnasai), GitHub (ramleo), DockerHub (wram), or the contact form on this page.",
};

function buildSystemPrompt(section: string): string {
  const ctx = SECTION_CONTEXT[section] ?? "The visitor is browsing the portfolio.";
  return `You are an AI assistant embedded in the portfolio website of Ramakrishnasai Wuppalapati (AIRaML), an ML Engineer and Data Scientist based in Hyderabad, India.

Your role is to help visitors learn about his skills, projects, experience, and background. Keep responses concise — 2 to 4 sentences maximum. Be friendly, specific, and professional.

${ctx}

Do not make up information not provided here. If asked something you don't know, suggest the visitor use the contact form.`;
}

type ChatMessage = { role: string; content: string };

// Belt-and-braces for reasoning models. `reasoning_format: 'hidden'` below is
// the actual fix; this catches the case where a provider stops honouring it or
// the model is swapped again. Mirrors the backend's strip_thinking()
// (routers/rag/mm_caption.py), including its unterminated case: if generation
// was cut off mid-monologue there is no answer in there to salvage, and the
// reasoning dump must not be shown to a visitor.
function stripThinking(text: string | undefined): string | undefined {
  if (!text || !text.includes('<think>')) return text;
  const end = text.indexOf('</think>');
  if (end === -1) return undefined;
  const rest = text.slice(end + '</think>'.length).trim();
  return rest || undefined;
}

async function callCohere(key: string, systemPrompt: string, messages: ChatMessage[]): Promise<LlmResult> {
  // Matches the shape the ML-Unified backend already uses for Cohere
  // (routers/rag/llm.py, routers/document/_llm.py): v2/chat, system as the
  // first message, and the reply at message.content[0].text — NOT the v1
  // `text` field. Same model the backend's cascade leads with.
  const fmt = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];
  const res = await fetch('https://api.cohere.ai/v2/chat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'command-a-03-2025',
      messages: fmt,
      max_tokens: 400,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/cohere]', res.status, err);
    throw new Error(`Cohere ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return { text: data.message?.content?.[0]?.text ?? "No response received.",
           usage: extractUsage("cohere", data), model: "command-a-03-2025" };
}

async function callGemini(key: string, systemPrompt: string, messages: ChatMessage[]): Promise<LlmResult> {
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/gemini]', res.status, err);
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 120)}`);
  }
  const data = await res.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response received.",
           usage: extractUsage("gemini", data), model: "gemini-2.5-flash" };
}

async function callClaude(key: string, systemPrompt: string, messages: ChatMessage[]): Promise<LlmResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/claude]', res.status, err);
    // Carry the status so E3's auth-failure detection can see a 401/403.
    throw new Error(`Claude ${res.status}`);
  }
  const data = await res.json();
  return { text: data.content?.[0]?.text ?? "No response received.",
           usage: extractUsage("claude", data), model: "claude-haiku-4-5-20251001" };
}

async function callGroq(key: string, systemPrompt: string, messages: ChatMessage[]): Promise<LlmResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      // llama-3.1-8b-instant was retired by Groq (404 model_not_found), which
      // made the Groq option in this chat throw for every visitor who picked
      // it. Verified 2026-09-06: this name resolves; max_tokens 400 below fits
      // the free tier's 1000 output-tokens-per-minute cap.
      model: 'qwen/qwen3.6-27b',
      // qwen is a reasoning model: without this it returns its <think> monologue
      // as the reply and the real answer is truncated away by max_tokens. The
      // model swap above fixed the 404 but the reply body was never read, so
      // every Groq answer was a reasoning dump. Verified 2026-09-07: 'hidden'
      // returns a clean, complete answer well inside the 400-token budget.
      reasoning_format: 'hidden',
      // 400 was enough for the old non-reasoning llama. qwen spends output
      // budget on hidden reasoning before it writes anything, so at 400 the
      // visible answer was still being cut off mid-sentence. 900 keeps a single
      // reply inside the free tier's 1000 output-tokens-per-minute cap.
      max_tokens: 900,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[chat/groq]', res.status, err);
    // Carry the status so E3's auth-failure detection can see a 401/403.
    throw new Error(`Groq ${res.status}`);
  }
  const data = await res.json();
  return { text: stripThinking(data.choices?.[0]?.message?.content) ?? "No response received.",
           usage: extractUsage("groq", data), model: "qwen/qwen3.6-27b" };
}

export async function POST(req: NextRequest) {
  // O1: the id the frontend minted for this action; tag Sentry so any captured
  // exception carries it, and thread it into the auth-failure record below.
  const traceId = traceIdFrom(req);
  Sentry.setTag('trace_id', traceId);

  const { messages: rawMessages, section, provider = 'cohere' } = await req.json();

  const bounded = boundConversation(rawMessages);
  if ('error' in bounded) return NextResponse.json({ reply: bounded.error }, { status: bounded.status });
  const { messages } = bounded;

  const systemPrompt = buildSystemPrompt(section ?? 'hero');

  const t0 = Date.now();
  try {
    let result: LlmResult;

    if (provider === 'claude') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return NextResponse.json({ reply: "Claude is not configured yet. Try Cohere or Groq!" });
      result = await callClaude(key, systemPrompt, messages);

    } else if (provider === 'groq') {
      const key = process.env.GROQ_API_KEY;
      if (!key) return NextResponse.json({ reply: "Groq is not configured yet. Try Cohere or Claude!" });
      result = await callGroq(key, systemPrompt, messages);

    } else if (provider === 'gemini') {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return NextResponse.json({ reply: "Gemini is not configured yet. Try Cohere or Groq!" });
      result = await callGemini(key, systemPrompt, messages);

    } else {
      // Default. Gemini is the one paid provider here, so it is no longer what
      // an unspecified request gets — it stays available as an explicit pick.
      const key = process.env.COHERE_API_KEY;
      if (!key) return NextResponse.json({ reply: "Cohere is not configured yet. Try Groq, or use the contact form to get in touch!" });
      result = await callCohere(key, systemPrompt, messages);
    }

    // O3: one row per call — provider/model/tokens/cost/latency, joined to the
    // action by run_id (= trace id).
    await recordLlmCall({ tool: "chat", provider, model: result.model, status: "ok",
      latencyMs: Date.now() - t0, usage: result.usage, runId: traceId, operation: "chat" });
    return NextResponse.json({ reply: result.text });
  } catch (e) {
    console.error('[chat] unhandled error:', `trace=${traceId}`, e);
    const http = (e as { status?: number })?.status ?? null;
    await recordLlmCall({ tool: "chat", provider, status: "error", latencyMs: Date.now() - t0,
      httpStatus: http, errorMessage: e instanceof Error ? e.message : String(e),
      runId: traceId, operation: "chat" });
    // E3: chat always uses the site's server keys, so a 401/403 is a stale key.
    if (isAuthFailure(e)) await recordProviderAuthFailure({ route: "chat", provider, error: e, traceId });
    return NextResponse.json({ reply: "Something went wrong. Please try again." });
  }
}
