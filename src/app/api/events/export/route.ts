import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getRangeWindow(range: string): { start: string; end?: string } {
  const now = new Date();
  switch (range) {
    case "yesterday": {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0, 0, 0, 0);
      const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
      return { start: d.toISOString(), end: end.toISOString() };
    }
    case "7d": { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 7); return { start: d.toISOString() }; }
    case "30d": { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 30); return { start: d.toISOString() }; }
    default: { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return { start: d.toISOString() }; }
  }
}

function escCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  try {
    const range      = req.nextUrl.searchParams.get("range") ?? "today";
    const startParam = req.nextUrl.searchParams.get("start");
    const endParam   = req.nextUrl.searchParams.get("end");

    let start: string, end: string | undefined;
    if (startParam) {
      start = `${startParam}T00:00:00.000Z`;
      end   = `${endParam ?? startParam}T23:59:59.999Z`;
    } else {
      const w = getRangeWindow(range); start = w.start; end = w.end;
    }

    const supabase = getClient();
    let query = supabase
      .from("events")
      .select("id, created_at, type, path, session_id, country, duration_ms, meta")
      .order("created_at", { ascending: false })
      .gte("created_at", start)
      .limit(5000);
    if (end) query = query.lte("created_at", end);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const header = ["id", "created_at", "type", "path", "session_id", "country", "duration_ms", "meta"];
    const lines = [
      header.join(","),
      ...rows.map(r => [
        escCsv(r.id),
        escCsv(r.created_at),
        escCsv(r.type),
        escCsv(r.path),
        escCsv(r.session_id),
        escCsv(r.country),
        escCsv(r.duration_ms),
        escCsv(r.meta ? JSON.stringify(r.meta) : ""),
      ].join(",")),
    ];

    const filename = `analytics-${startParam ?? range}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}