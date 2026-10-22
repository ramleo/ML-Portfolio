import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 M3 — owner read over online_scores: how a sample of REAL live answers scored on
 * the reference-free judge (faithful + relevant → pass). Pass rate overall + daily trend,
 * sampling coverage (tail vs random), and volume judged. All content-free. */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? ""; const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

interface Row {
  created_at: string | null; faithful: boolean | null; relevant: boolean | null;
  passed: boolean | null; sampled_reason: string | null; groundedness: number | null;
}

const rate = (hits: number, n: number) => (n ? hits / n : null);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 30));
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days);

  const admin = createAdminClient();
  const { data, error } = await admin.from("online_scores")
    .select("created_at,faithful,relevant,passed,sampled_reason,groundedness")
    .gte("created_at", start.toISOString()).order("created_at", { ascending: false }).limit(10000);

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ needs_setup: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const judged = rows.filter((r) => r.passed !== null);
  const nj = judged.length;

  // Daily pass rate (gap-filled) for the trend line.
  const byDay = new Map<string, { pass: number; n: number }>();
  for (const r of judged) {
    if (!r.created_at) continue;
    const d = r.created_at.slice(0, 10);
    const cur = byDay.get(d) ?? { pass: 0, n: 0 };
    cur.n += 1; if (r.passed) cur.pass += 1;
    byDay.set(d, cur);
  }
  const daily: { date: string; pass_rate: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setUTCHours(0, 0, 0, 0); dt.setUTCDate(dt.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const v = byDay.get(key);
    daily.push({ date: key, pass_rate: v && v.n ? v.pass / v.n : null });
  }

  const g = judged.map((r) => r.groundedness).filter((x): x is number => typeof x === "number");

  return NextResponse.json({
    total: nj,
    pass_rate: rate(judged.filter((r) => r.passed).length, nj),
    faithful_rate: rate(judged.filter((r) => r.faithful).length, nj),
    relevant_rate: rate(judged.filter((r) => r.relevant).length, nj),
    tail_count: rows.filter((r) => r.sampled_reason === "tail").length,
    random_count: rows.filter((r) => r.sampled_reason === "random").length,
    avg_groundedness: g.length ? g.reduce((a, b) => a + b, 0) / g.length : null,
    daily,
  });
}
