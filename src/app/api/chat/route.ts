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

type RagResult = { answer: string; grounded: boolean };

/** A source grounds the answer in THIS website only if it is a knowledge-base file
 * (e.g. "06-testwright.md"). The RAG web-fallbacks on low KB confidence, and those
 * sources are "web:https://…" — an off-topic answer from the open web, which the
 * homepage assistant must not serve. */
const isSiteSource = (s: unknown): boolean =>
  typeof s === 'string' && s.length > 0 && !s.startsWith('web:');

type Turn = { role: string; content: string };

async function askRag(query: string, provider: string, history: Turn[]): Promise<RagResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch(`${ML_API}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      // Pass prior turns so follow-ups resolve ("give me the link to go" must point at
      // the tool just discussed, not a random one). The RAG appends `query` itself.
      body: JSON.stringify({ query, provider, model: PROVIDER_MODEL[provider], history }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error(`RAG ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let answer = '';
    let errMsg = '';
    const sources: unknown[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let ev: { type?: string; text?: string; answer?: string; message?: string;
                  doc?: { source?: string }; sources?: unknown[] };
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === 'token' && typeof ev.text === 'string') answer += ev.text;
        else if (ev.type === 'answer' && !answer && typeof ev.answer === 'string') answer = ev.answer;
        else if (ev.type === 'source' && ev.doc?.source) sources.push(ev.doc.source);
        else if (ev.type === 'done' && Array.isArray(ev.sources)) sources.push(...ev.sources);
        else if (ev.type === 'error') errMsg = ev.message || 'rag error';
      }
    }
    if (!answer && errMsg) throw new Error(errMsg);
    return { answer: answer.trim(), grounded: sources.some(isSiteSource) };
  } finally {
    clearTimeout(timer);
  }
}

const OFF_TOPIC_REPLY =
  "I can only help with questions about this website — its tools, platforms, and features. Try asking about one of those, or use the contact form.";

export async function POST(req: NextRequest) {
  const traceId = traceIdFrom(req);
  Sentry.setTag('trace_id', traceId);

  const { messages: rawMessages, provider = 'cohere' } = await req.json();

  const bounded = boundConversation(rawMessages);
  if ('error' in bounded) return NextResponse.json({ reply: bounded.error }, { status: bounded.status });
  const { messages } = bounded;

  const lastUserIdx = messages.map((m: Turn) => m.role).lastIndexOf('user');
  if (lastUserIdx < 0) return NextResponse.json({ reply: 'Ask me anything about this website.' });
  const lastUser = messages[lastUserIdx];
  // Prior turns (bounded) give the RAG context for follow-ups; the query is appended by it.
  const history: Turn[] = messages
    .slice(0, lastUserIdx)
    .slice(-6)
    .map((m: Turn) => ({ role: m.role, content: m.content }));

  // A short/referential follow-up ("give me the link to go", "open it") has no keywords
  // to retrieve on, so the RAG pulls the wrong chunks and invents a path. Resolve it into
  // a standalone retrieval query by prefixing the most recent prior question.
  const priorUser = [...history].reverse().find((m) => m.role === 'user');
  const referential = /\b(it|that|this|there|the link|link|go|open|show|which|where)\b/i;
  const q = lastUser.content as string;
  const query =
    priorUser && (q.length < 40 || referential.test(q)) ? `${priorUser.content} — ${q}` : q;

  const t0 = Date.now();
  try {
    const { answer, grounded } = await askRag(query, provider, history);
    await recordLlmCall({ tool: 'chat', provider, status: 'ok', latencyMs: Date.now() - t0,
      runId: traceId, operation: 'chat' });
    // Website-only: if the answer isn't grounded in a real site source (the RAG
    // web-fell-back for an off-topic question), decline instead of serving it.
    if (!grounded || !answer) return NextResponse.json({ reply: OFF_TOPIC_REPLY });
    return NextResponse.json({ reply: answer });
  } catch (e) {
    console.error('[chat] error:', `trace=${traceId}`, e);
    await recordLlmCall({ tool: 'chat', provider, status: 'error', latencyMs: Date.now() - t0,
      errorMessage: e instanceof Error ? e.message : String(e), runId: traceId, operation: 'chat' });
    return NextResponse.json({ reply: 'Something went wrong. Please try again.' });
  }
}
