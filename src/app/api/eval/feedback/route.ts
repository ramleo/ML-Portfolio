import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 (Portkey-style feedback) — owner read of answer_feedback over a window:
 * overall up/down counts + satisfaction, and a per-model breakdown. Content-free. */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? ""; const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || /does not exist/i.test(msg) || /could not find/i.test(msg);
}

interface Row { rating: number | null; model: string | null }

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days);

  const admin = createAdminClient();
  const { data, error } = await admin.from("answer_feedback")
    .select("rating,model").gte("ts", start.toISOString()).limit(20000);
  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ needs_setup: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const up = rows.filter((r) => r.rating === 1).length;
  const down = rows.filter((r) => r.rating === -1).length;
  const byModel = new Map<string, { up: number; down: number }>();
  for (const r of rows) {
    const k = r.model || "unknown";
    const a = byModel.get(k) ?? { up: 0, down: 0 };
    if (r.rating === 1) a.up++; else if (r.rating === -1) a.down++;
    byModel.set(k, a);
  }
  return NextResponse.json({
    needs_setup: false, total: rows.length, up, down,
    satisfaction: up + down ? up / (up + down) : null,
    byModel: [...byModel.entries()].map(([name, v]) => ({ name, ...v, total: v.up + v.down }))
      .sort((a, b) => b.total - a.total),
  });
}
