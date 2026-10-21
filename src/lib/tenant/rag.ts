/** Q3 M1 — tenant-RAG helpers (server-only).
 *
 * The control plane lives here (we hold the Supabase service-role key and own the
 * pgvector store); the HF Space is a stateless compute node we call for embeddings
 * and generation over a shared internal token. Keep this module server-only —
 * TENANT_INTERNAL_TOKEN must never reach the browser.
 */

const ML_API_URL = process.env.ML_API_URL ?? "https://wram1708-ml-unified.hf.space";
const INTERNAL_TOKEN = process.env.TENANT_INTERNAL_TOKEN ?? "";

async function callSpace<T>(path: string, body: unknown): Promise<T> {
  if (!INTERNAL_TOKEN) throw new Error("TENANT_INTERNAL_TOKEN not configured");
  const res = await fetch(`${ML_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-token": INTERNAL_TOKEN },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Space ${path} failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const data = await callSpace<{ embeddings: number[][] }>("/internal/tenant/embed", { texts });
  return data.embeddings;
}

export interface TenantAnswerConfig { system_prompt?: string; provider?: string; model?: string; web_search?: boolean }
export interface TenantAnswer { answer: string; web_used: boolean; sources: string[] }

export async function answerFromContext(question: string, contexts: string[], config: TenantAnswerConfig = {}): Promise<TenantAnswer> {
  const data = await callSpace<{ answer: string; web_used?: boolean; sources?: string[] }>("/internal/tenant/answer", {
    question, contexts,
    system_prompt: config.system_prompt ?? "",
    provider: config.provider ?? "cohere",
    model: config.model ?? "",
    web_search: config.web_search ?? false,
  });
  return { answer: data.answer, web_used: !!data.web_used, sources: data.sources ?? [] };
}

/** Split plain text into overlapping word-window chunks. Simple on purpose for M1;
 * richer chunking (sentence-aware, PDF/table extraction) comes with the engine
 * reuse in a later milestone. */
export function chunkText(text: string, size = 180, overlap = 40): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [];
  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + size).join(" "));
    if (i + size >= words.length) break;
  }
  return chunks;
}
