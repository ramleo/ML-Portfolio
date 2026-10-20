import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 (Portkey-style budget) — owner read of month-to-date LLM spend vs a budget,
 * with a simple end-of-month projection so a cost overrun is caught early. Budget
 * comes from EVAL_MONTHLY_BUDGET_USD (default $10); cost is summed from llm_calls
 * for the current UTC month. No new logging — reuses the O3 cost column. */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? ""; const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || code === "42703" || /does not exist/i.test(msg) || /could not find/i.test(msg);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const budget = Number(process.env.EVAL_MONTHLY_BUDGET_USD) || 10;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const dayOfMonth = now.getUTCDate();

  const admin = createAdminClient();
  const { data, error } = await admin.from("llm_calls")
    .select("cost_usd").gte("ts", monthStart.toISOString()).limit(20000);
  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ needs_setup: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mtd = (data ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const projected = dayOfMonth > 0 ? (mtd / dayOfMonth) * daysInMonth : mtd;
  return NextResponse.json({
    needs_setup: false, budget, mtd, projected,
    pct: budget > 0 ? mtd / budget : null,
    projected_pct: budget > 0 ? projected / budget : null,
    day_of_month: dayOfMonth, days_in_month: daysInMonth,
    month: monthStart.toISOString().slice(0, 7),
  });
}
