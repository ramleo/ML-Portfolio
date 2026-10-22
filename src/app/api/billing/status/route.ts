import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { isOwnerEmail } from "@/lib/auth/owner";
import { getPlan, maxBots } from "@/lib/auth/plan";
import { billingConfigured } from "@/lib/billing/stripe";

/** Q3 M4b — current billing state for the signed-in user, for the /app/billing page. */
export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const plan = await getPlan(admin, user.id);
  const { data } = await admin
    .from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();

  const owner = isOwnerEmail(user.email);
  return NextResponse.json({
    plan,
    is_owner: owner,
    max_bots: maxBots(plan, user.email) === Infinity ? null : maxBots(plan, user.email),
    has_billing_account: !!data?.stripe_customer_id,
    configured: billingConfigured,
  });
}
