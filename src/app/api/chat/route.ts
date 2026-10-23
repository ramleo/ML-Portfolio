import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { boundConversation } from '@/lib/chatLimits';
import { traceIdFrom } from '@/lib/trace';
import { recordLlmCall } from '@/lib/llmTelemetry';

/**
 * Homepage chat — proxies the site's GROUNDED RAG (the Space's /rag/query), the same
 * knowledge base the tool chats use. It is grounded in the whole handbook — every
 * tool AND platform AND site feature — so it can answer any website question and
 * declines (doesn't invent) when the KB has nothing. This replaced a bare,
 * ungrounded LLM call that only had hardcoded section blurbs and so hallucinated
 * about the tools. The Space uses its own working provider keys and has its own
 * provider fallback cascade, so a single provider being down no longer breaks chat.
 */

const ML_API =
  process.env.ML_API_URL ||
  process.env.NEXT_PUBLIC_ML_UNIFIED_URL ||
  'https://wram1708-ml-unified.hf.space';

// The homepage provider picker → the RAG. Groq pins qwen/qwen3.8-27b: Groq retired
// qwen3.6-27b (404 model_not_found) and gpt-oss is reasoning-heavy; qwen3.8-27b is
// the current, clean Groq chat model (verified live). Others use the RAG's default.
const PROVIDER_MODEL: Record<string, string | undefined> = {
  groq: 'qwen/qwen3.8-27b',
};

async function askRag(query: string, provider: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch(`${ML_API}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ query, provider, model: PROVIDER_MODEL[provider] }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`RAG ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let answer = '';
    let errMsg = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let ev: { type?: string; text?: string; answer?: string; message?: string };
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === 'token' && typeof ev.text === 'string') answer += ev.text;
        // Some streams also emit a final consolidated answer; prefer the token
        // stream but fall back to it if no tokens came through.
        else if (ev.type === 'answer' && !answer && typeof ev.answer === 'string') answer = ev.answer;
        else if (ev.type === 'error') errMsg = ev.message || 'rag error';
      }
    }
    if (!answer && errMsg) throw new Error(errMsg);
    return answer.trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const traceId = traceIdFrom(req);
  Sentry.setTag('trace_id', traceId);

  const { messages: rawMessages, provider = 'cohere' } = await req.json();

  const bounded = boundConversation(rawMessages);
  if ('error' in bounded) return NextResponse.json({ reply: bounded.error }, { status: bounded.status });
  const { messages } = bounded;

  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
  if (!lastUser) return NextResponse.json({ reply: 'Ask me anything about this website.' });

  const t0 = Date.now();
  try {
    const reply = await askRag(lastUser.content, provider);
    await recordLlmCall({ tool: 'chat', provider, status: 'ok', latencyMs: Date.now() - t0,
      runId: traceId, operation: 'chat' });
    return NextResponse.json({
      reply: reply || "I couldn't find that in this site's content. Try rephrasing, or use the contact form.",
    });
  } catch (e) {
    console.error('[chat] error:', `trace=${traceId}`, e);
    await recordLlmCall({ tool: 'chat', provider, status: 'error', latencyMs: Date.now() - t0,
      errorMessage: e instanceof Error ? e.message : String(e), runId: traceId, operation: 'chat' });
    return NextResponse.json({ reply: 'Something went wrong. Please try again.' });
  }
}
