import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Unified activity log — one chronological feed of EVERYTHING that happened, like
 * a HuggingFace Space log: every LLM call (ok / warning / 429 / error / in-band
 * failure) from `llm_calls`, merged with app errors (crashes, 500s) from `errors`.
 * Each row has a level (ok | warn | error) and full detail so the dashboard can show
 * "what's wrong or not" and let you click into any one. Content-free: statuses,
 * timings, provider error envelopes and the trace id — never prompts or user data.
 *
 *   GET /api/activity?range=today&level=all|warn|error  -> { rows: [...] } newest first
 */

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "42703" || /schema cache/i.test(msg)
    || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

function getWindow(range: string, startParam: string | null, endParam: string | null): { start: string; end: string } {
  if (startParam) {
    return { start: `${startParam}T00:00:00.000Z`, end: `${endParam ?? startParam}T23:59:59.999Z` };
  }
  const now = new Date();
  if (range === "yesterday") {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0, 0, 0, 0);
    const e = new Date(d); e.setUTCHours(23, 59, 59, 999);
    return { start: d.toISOString(), end: e.toISOString() };
  }
  if (range === "7d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 7); return { start: d.toISOString(), end: now.toISOString() }; }
  if (range === "30d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 30); return { start: d.toISOString(), end: now.toISOString() }; }
  const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
  return { start: d.toISOString(), end: now.toISOString() };
}

export type ActivityRow = {
  ts: string;
  level: "ok" | "warn" | "error";
  kind: "llm" | "app";
  source: string;        // provider (llm) or error source (app)
  summary: string;       // one-line what-happened
  http_status: number | null;
  detail: string;        // error_message / message (empty on ok)
  trace_id: string;
  latency_ms: number | null;
  tool: string;
};

type LlmRow = {
  ts: string; provider: string | null; model: string | null; status: string | null;
  http_status: number | null; error_code: string | null; error_message: string | null;
  latency_ms: number | null; operation: string | null; run_id: string | null; tool: string | null;
};
type ErrRow = {
  created_at: string; source: string | null; kind: string | null;
  message: string | null; route: string | null; meta: { trace_id?: string } | null;
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const range = sp.get("range") ?? "today";
    const level = sp.get("level") ?? "all";
    const { start, end } = getWindow(range, sp.get("start"), sp.get("end"));
    const supabase = getClient();

    const rows: ActivityRow[] = [];

    // 1) LLM calls — the richest activity stream (ok / 429 / error / in-band).
    const llm = await supabase.from("llm_calls")
      .select("ts,provider,model,status,http_status,error_code,error_message,latency_ms,operation,run_id,tool")
      .gte("ts", start).lte("ts", end).order("ts", { ascending: false }).limit(500);
    if (llm.error && isMissingSchema(llm.error)) return NextResponse.json({ rows: [], needs_setup: true });
    for (const r of (llm.data ?? []) as LlmRow[]) {
      const ok = r.status === "ok";
      const lvl: ActivityRow["level"] = ok ? "ok" : r.http_status === 429 ? "warn" : "error";
      const op = r.operation || "chat";
      rows.push({
        ts: r.ts, level: lvl, kind: "llm", source: r.provider || "llm",
        summary: `${r.provider ?? "llm"}/${r.model ?? "?"} · ${op} · ${ok ? "ok" : (r.http_status ? `HTTP ${r.http_status}` : "error")}`,
        http_status: r.http_status, detail: ok ? "" : (r.error_message || r.error_code || "failed"),
        trace_id: r.run_id || "", latency_ms: r.latency_ms, tool: r.tool || "",
      });
    }

    // 2) App errors — crashes / 500s (errors table uses created_at).
    const errs = await supabase.from("errors")
      .select("created_at,source,kind,message,route,meta")
      .gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }).limit(300);
    // errors table missing is non-fatal — just show the LLM stream.
    if (!errs.error) for (const r of (errs.data ?? []) as ErrRow[]) {
      rows.push({
        ts: r.created_at, level: "error", kind: "app", source: r.source || "app",
        summary: `${r.source ?? "app"} · ${r.kind ?? "Error"}${r.route ? ` · ${r.route}` : ""}`,
        http_status: null, detail: r.message || "", trace_id: r.meta?.trace_id ?? "",
        latency_ms: null, tool: "",
      });
    }

    rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
    const filtered = level === "all" ? rows
      : level === "error" ? rows.filter(r => r.level === "error")
      : level === "warn" ? rows.filter(r => r.level !== "ok")
      : rows;

    const counts = {
      ok: rows.filter(r => r.level === "ok").length,
      warn: rows.filter(r => r.level === "warn").length,
      error: rows.filter(r => r.level === "error").length,
    };
    return NextResponse.json({ rows: filtered.slice(0, 300), counts });
  } catch (e) {
    return NextResponse.json({ rows: [], error: (e as Error).message }, { status: 500 });
  }
}
